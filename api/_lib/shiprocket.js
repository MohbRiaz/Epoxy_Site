/* Shiprocket API helpers.
   Needs an API user (Shiprocket panel → Settings → API → Create API user)
   and the exact name of your pickup address in Shiprocket. */
const BASE = 'https://apiv2.shiprocket.in/v1/external';
const CATALOG = require('../../data/catalog.js');
const enabled = () => !!(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD);

let token = null, tokenAt = 0, pending = null;
function login() {                       // parallel requests share one login
  if (!pending) pending = doLogin().finally(() => { pending = null; });
  return pending;
}
async function doLogin() {
  const r = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: process.env.SHIPROCKET_EMAIL, password: process.env.SHIPROCKET_PASSWORD }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.token) throw new Error('Shiprocket login failed — check SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD (use the API user, not your panel login).');
  token = d.token; tokenAt = Date.now();
  return token;
}
async function sr(path, method = 'GET', body, retry = true) {
  if (!token || Date.now() - tokenAt > 8 * 864e5) await login();       // tokens last ~10 days
  const r = await fetch(`${BASE}${path}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 401 && retry) { token = null; return sr(path, method, body, false); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(d.message || (d.errors && JSON.stringify(d.errors)) || `Shiprocket ${r.status}`); e.data = d; throw e; }
  return d;
}

/* Can we deliver to this PIN code? → { serviceable, cod, days, etd } */
async function checkService(pincode, { cod = false, weightKg = 0.5 } = {}) {
  const q = new URLSearchParams({ pickup_postcode: process.env.SHIPROCKET_PICKUP_PINCODE || '', delivery_postcode: pincode, cod: cod ? '1' : '0', weight: String(Math.max(0.1, weightKg)) });
  const d = await sr(`/courier/serviceability/?${q}`);
  const list = d?.data?.available_courier_companies || [];
  if (!list.length) return { serviceable: false, cod: false };
  const days = list.map((c) => parseInt(c.estimated_delivery_days, 10)).filter((n) => n > 0);
  const fastest = list.slice().sort((a, b) => (parseInt(a.estimated_delivery_days, 10) || 99) - (parseInt(b.estimated_delivery_days, 10) || 99))[0];
  return { serviceable: true, cod: list.some((c) => Number(c.cod) === 1), days: days.length ? Math.min(...days) : null, etd: fastest?.etd || null };
}

/* Shipping weight & box for a set of priced lines */
function parcel(totals) {
  const s = CATALOG.store.shipping || {};
  let kg = 0; const box = { l: s.box?.l || 20, b: s.box?.b || 15, h: s.box?.h || 10 };
  for (const l of totals.lines) {
    const p = CATALOG.findProduct(l.pid); const v = CATALOG.findVariant(p, l.vid) || {};
    kg += (v.shipKg || (v.grams ? (v.grams * 1.15) / 1000 : s.defaultWeightKg || 0.5)) * l.qty;
    if (v.box) { box.l = Math.max(box.l, v.box.l); box.b = Math.max(box.b, v.box.b); box.h = Math.max(box.h, v.box.h); }
  }
  return { weight: Math.round(Math.max(0.1, kg) * 100) / 100, length: box.l, breadth: box.b, height: box.h };
}

function istNow() {
  const d = new Date(Date.now() + 5.5 * 3600e3);
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

/* Create the order in Shiprocket → { order_id, shipment_id } */
async function createOrder({ orderRef, totals, customer: c, payment }) {
  const [first, ...rest] = String(c.name || '').trim().split(/\s+/);
  const body = {
    order_id: orderRef,
    order_date: istNow(),
    pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
    billing_customer_name: first || 'Customer',
    billing_last_name: rest.join(' '),
    billing_address: String(c.address || '').slice(0, 190),
    billing_city: c.city, billing_pincode: String(c.pincode), billing_state: c.state, billing_country: 'India',
    billing_email: c.email, billing_phone: String(c.phone || '').replace(/\D/g, '').slice(-10),
    shipping_is_billing: true,
    order_items: totals.lines.map((l) => {
      const p = CATALOG.findProduct(l.pid);
      return { name: `${l.name} — ${l.variant}`.slice(0, 120), sku: l.sku || `${l.pid}-${l.vid}`.slice(0, 50), units: l.qty, selling_price: l.unit, discount: '', tax: '', hsn: p?.hsn || '' };
    }),
    payment_method: payment === 'cod' ? 'COD' : 'Prepaid',
    sub_total: totals.subtotal,
    total_discount: totals.discount || 0,
    shipping_charges: totals.shipping || 0,
    transaction_charges: totals.codFee || 0,
    comment: c.notes ? String(c.notes).slice(0, 200) : '',
    ...parcel(totals)
  };
  const d = await sr('/orders/create/adhoc', 'POST', body);
  return { order_id: d.order_id, shipment_id: d.shipment_id, status: d.status };
}

/* Find our order in Shiprocket by order number, check the phone matches, return tracking */
async function trackOrder(orderRef, phone) {
  const d = await sr(`/orders?search=${encodeURIComponent(orderRef)}&per_page=10`);
  const list = Array.isArray(d?.data) ? d.data : [];
  const o = list.find((x) => String(x.channel_order_id || x.order_id || '').toUpperCase() === orderRef.toUpperCase());
  if (!o) return null;
  const p1 = String(o.customer_phone || o.billing_phone || '').replace(/\D/g, '').slice(-10);
  if (!p1 || p1 !== String(phone).replace(/\D/g, '').slice(-10)) return null;
  const sh = (o.shipments && o.shipments[0]) || {};
  const out = { status: o.status || 'Processing', awb: sh.awb || sh.awb_code || null, courier: sh.courier || sh.courier_name || null, etd: sh.etd || null, events: [], trackUrl: null };
  if (sh.id) {
    try {
      const t = await sr(`/courier/track/shipment/${sh.id}`);
      const td = t.tracking_data || Object.values(t)[0]?.tracking_data || {};
      const st = (td.shipment_track || [])[0] || {};
      out.status = st.current_status || out.status;
      out.awb = st.awb_code || out.awb; out.courier = st.courier_name || out.courier;
      out.etd = td.etd || st.edd || out.etd; out.trackUrl = td.track_url || null;
      out.events = (td.shipment_track_activities || []).slice(0, 15).map((a) => ({ date: a.date, text: a.activity || a['sr-status-label'] || '', place: a.location || '' }));
    } catch (e) { /* tracking not ready until an AWB is assigned */ }
  }
  return out;
}

module.exports = { enabled, checkService, createOrder, trackOrder, parcel };
