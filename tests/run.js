/* Offline tests for the API — fakes Odoo, Razorpay and Shiprocket. Run: npm test */
const assert = require('assert');
const crypto = require('crypto');

const calls = [];
const rzOrders = {};              // fake Razorpay order store
const srOrders = [];              // fake Shiprocket order store
let srFail = false, srLogins = 0;
const json = (status, data) => ({ ok: status < 400, status, json: async () => data });

global.fetch = async (url, opts = {}) => {
  const body = opts.body ? JSON.parse(opts.body) : null;
  const method = opts.method || 'GET';
  calls.push({ url, method, body });
  // Odoo
  if (url.endsWith('/jsonrpc')) return json(200, { result: body.params.service === 'common' ? 7 : 101 });
  if (url === 'https://hook.example') return json(200, {});
  // Razorpay
  if (url === 'https://api.razorpay.com/v1/orders' && method === 'POST') {
    const id = 'order_' + (Object.keys(rzOrders).length + 1);
    rzOrders[id] = { id, amount: body.amount, amount_paid: 0, status: 'created', notes: body.notes };
    return json(200, rzOrders[id]);
  }
  let m = url.match(/^https:\/\/api\.razorpay\.com\/v1\/orders\/(.+)$/);
  if (m) {
    const o = rzOrders[decodeURIComponent(m[1])];
    if (!o) return json(404, { error: { description: 'not found' } });
    if (method === 'PATCH') o.notes = body.notes;
    return json(200, o);
  }
  // Shiprocket
  if (url.endsWith('/auth/login')) { srLogins++; return json(200, { token: 'T' }); }
  if (url.includes('/courier/serviceability/')) {
    const q = new URL(url).searchParams;
    if (q.get('delivery_postcode') === '999999') return json(200, { data: { available_courier_companies: [] } });
    const cod = q.get('cod') === '1';
    if (cod && q.get('delivery_postcode') === '110001') return json(200, { data: { available_courier_companies: [] } });
    return json(200, { data: { available_courier_companies: [{ courier_name: 'Delhivery', estimated_delivery_days: '3', etd: 'Nov 02, 2026', cod: 1 }, { courier_name: 'Xpress', estimated_delivery_days: '5', cod: 0 }] } });
  }
  if (url.endsWith('/orders/create/adhoc')) {
    if (srFail) return json(422, { message: 'Wrong Pickup location entered' });
    const o = { order_id: 5000 + srOrders.length, shipment_id: 9000 + srOrders.length, status: 'NEW', req: body };
    srOrders.push(o); return json(200, o);
  }
  if (url.includes('/orders?search=')) {
    const ref = decodeURIComponent(new URL(url).searchParams.get('search'));
    const o = srOrders.find((x) => x.req.order_id === ref);
    return json(200, { data: o ? [{ channel_order_id: ref, customer_phone: o.req.billing_phone, status: 'READY TO SHIP', shipments: [{ id: o.shipment_id, awb: 'AWB123' }] }] : [] });
  }
  if (url.includes('/courier/track/shipment/')) return json(200, { tracking_data: { etd: '2026-11-02 18:00:00', track_url: 'https://shiprocket.co/tracking/AWB123', shipment_track: [{ current_status: 'In Transit', courier_name: 'Delhivery', awb_code: 'AWB123' }], shipment_track_activities: [{ date: '2026-10-30 10:00', activity: 'Picked up', location: 'Bengaluru' }] } });
  throw new Error('unexpected ' + method + ' ' + url);
};
Object.assign(process.env, {
  ODOO_URL: 'https://x.odoo.com', ODOO_DB: 'x', ODOO_USER: 'u', ODOO_API_KEY: 'k', LEAD_WEBHOOK_URL: 'https://hook.example',
  RAZORPAY_KEY_ID: 'rzp_test_1', RAZORPAY_KEY_SECRET: 'sek', RAZORPAY_WEBHOOK_SECRET: 'whsec',
  SHIPROCKET_EMAIL: 'api@x.in', SHIPROCKET_PASSWORD: 'pw', SHIPROCKET_PICKUP_LOCATION: 'Studio', SHIPROCKET_PICKUP_PINCODE: '560001'
});
console.log = () => {}; console.error = () => {};

const call = (h, body, { method = 'POST', url = '/', headers = {}, raw } = {}) => new Promise((resolve) => {
  const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(s) { resolve({ status: this.statusCode, data: JSON.parse(s) }); } };
  const req = { method, url, headers, body, rawBody: raw !== undefined ? raw : (body ? JSON.stringify(body) : '') };
  Promise.resolve(h(req, res));
});
const crmLeads = () => calls.filter((c) => c.body?.params?.method === 'execute_kw').map((c) => c.body.params.args[5][0]);
const customer = { name: 'Asha Rao', phone: '98765 43210', email: 'a@b.in', address: '12 MG Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' };
const items = [{ pid: 'superfirst-art-resin', vid: '1-5-kg', qty: 2 }, { pid: 'mica-powder-6-pack', vid: '6-pack', qty: 1 }];
const sign = (s, secret) => crypto.createHmac('sha256', secret).update(s).digest('hex');

(async () => {
  let r = await call(require('../api/config'), null, { method: 'GET' });
  assert.deepEqual(r.data, { razorpay: true, shiprocket: true });

  // --- leads
  r = await call(require('../api/lead'), { type: 'contact', name: 'Ravi', email: 'bad' });
  assert.equal(r.status, 400);
  r = await call(require('../api/lead'), { type: 'contact', name: 'Ravi', email: 'r@x.in', phone: '9876543210', enquiry: 'bulk', quantity: '50 kg', message: 'Need pricing' });
  assert.equal(r.status, 200);
  assert.match(crmLeads().pop().description, /quantity: 50 kg/);

  // --- shipping estimate
  r = await call(require('../api/shipping'), null, { method: 'GET', url: '/api/shipping?pincode=560034&kg=1' });
  assert.equal(r.data.serviceable, true); assert.equal(r.data.cod, true); assert.equal(r.data.days, 3);
  r = await call(require('../api/shipping'), null, { method: 'GET', url: '/api/shipping?pincode=110001' });
  assert.equal(r.data.serviceable, true); assert.equal(r.data.cod, false);
  r = await call(require('../api/shipping'), null, { method: 'GET', url: '/api/shipping?pincode=999999' });
  assert.equal(r.data.serviceable, false);

  // --- COD order → Shiprocket + CRM; tampered price ignored
  calls.length = 0;
  r = await call(require('../api/create-order'), { items: [{ pid: 'superfirst-art-resin', vid: '300-g', qty: 3, price: 1 }], coupon: 'NEW10', payment: 'cod', customer });
  assert.equal(r.status, 200);
  assert.equal(r.data.totals.total, 1258.47);
  const sr1 = srOrders[0].req;
  assert.equal(sr1.payment_method, 'COD'); assert.equal(sr1.pickup_location, 'Studio');
  assert.equal(sr1.billing_customer_name, 'Asha'); assert.equal(sr1.billing_last_name, 'Rao'); assert.equal(sr1.billing_phone, '9876543210');
  assert.equal(sr1.order_items[0].sku, 'EPO-300GM'); assert.equal(sr1.order_items[0].units, 3); assert.equal(sr1.order_items[0].selling_price, 466.1);
  assert.equal(sr1.sub_total, 1398.3); assert.equal(sr1.total_discount, 139.83);
  assert.ok(sr1.weight > 0.9 && sr1.weight < 1.1, 'weight from grams: ' + sr1.weight);
  let lead = crmLeads().pop();
  assert.match(lead.name, /COD order TES-.* ₹1,258.47/);
  assert.match(lead.description, /Shiprocket order: 5000, shipment: 9000/);
  assert.match(lead.description, /\[SKU EPO-300GM\]/);
  const codRef = r.data.orderRef;

  // COD refused where couriers can't collect cash
  r = await call(require('../api/create-order'), { items, payment: 'cod', customer: { ...customer, pincode: '110001' } });
  assert.equal(r.status, 400); assert.match(r.data.error, /Cash on delivery isn't available/);
  r = await call(require('../api/create-order'), { items, payment: 'cod', customer: { ...customer, pincode: '999999' } });
  assert.equal(r.status, 400);
  r = await call(require('../api/create-order'), { items: [], payment: 'cod', customer });
  assert.equal(r.status, 400);

  // --- tracking: needs matching phone
  r = await call(require('../api/track'), null, { method: 'GET', url: `/api/track?ref=${codRef}&phone=9999999999` });
  assert.equal(r.status, 404);
  r = await call(require('../api/track'), null, { method: 'GET', url: `/api/track?ref=${codRef}&phone=98765%2043210` });
  assert.equal(r.status, 200); assert.equal(r.data.status, 'In Transit'); assert.equal(r.data.awb, 'AWB123'); assert.equal(r.data.events.length, 1);

  // --- online payment: Razorpay order carries the cart in notes
  r = await call(require('../api/create-order'), { items, coupon: '', payment: 'razorpay', customer });
  assert.equal(r.status, 200);
  const total = 1016.1 * 2 + 720;
  assert.equal(r.data.razorpay.amount, Math.round(total * 100));
  const oid = r.data.razorpay.orderId;
  assert.equal(rzOrders[oid].notes.items1, 'superfirst-art-resin~1-5-kg~2|mica-powder-6-pack~6-pack~1');
  const before = srOrders.length;

  // browser confirms payment — cart comes from Razorpay, not from the browser
  rzOrders[oid].status = 'paid'; rzOrders[oid].amount_paid = rzOrders[oid].amount;
  calls.length = 0;
  r = await call(require('../api/verify-payment'), { razorpay_order_id: oid, razorpay_payment_id: 'pay_1', razorpay_signature: sign(`${oid}|pay_1`, 'sek'), items: [{ pid: 'superfirst-art-resin', vid: '6-kg', qty: 99 }] });
  assert.equal(r.status, 200);
  assert.equal(srOrders.length, before + 1);
  assert.equal(srOrders[before].req.payment_method, 'Prepaid');
  assert.equal(srOrders[before].req.order_items.length, 2);
  lead = crmLeads().pop();
  assert.match(lead.name, /^PAID order .* ₹2,752.20/);
  assert.match(lead.description, /Razorpay payment: pay_1/);
  assert.equal(rzOrders[oid].notes.fulfilled, '1');

  // webhook arrives afterwards → no duplicate Shiprocket order or CRM lead
  const evt = JSON.stringify({ event: 'order.paid', payload: { order: { entity: { id: oid } }, payment: { entity: { id: 'pay_1' } } } });
  calls.length = 0;
  r = await call(require('../api/razorpay-webhook'), null, { raw: evt, headers: { 'x-razorpay-signature': sign(evt, 'whsec') } });
  assert.equal(r.status, 200); assert.equal(r.data.already, true);
  assert.equal(srOrders.length, before + 1); assert.equal(crmLeads().length, 0);
  // bad signatures rejected
  r = await call(require('../api/razorpay-webhook'), null, { raw: evt, headers: { 'x-razorpay-signature': 'bad' } });
  assert.equal(r.status, 400);
  r = await call(require('../api/verify-payment'), { razorpay_order_id: oid, razorpay_payment_id: 'pay_1', razorpay_signature: 'bad' });
  assert.equal(r.status, 400);

  // customer closed the tab: only the webhook arrives → order still fulfilled
  r = await call(require('../api/create-order'), { items: [{ pid: 'superfirst-top-coat', vid: '1-5-kg-kit', qty: 1 }], payment: 'razorpay', customer });
  const oid2 = r.data.razorpay.orderId;
  rzOrders[oid2].status = 'paid'; rzOrders[oid2].amount_paid = rzOrders[oid2].amount;
  const evt2 = JSON.stringify({ event: 'order.paid', payload: { order: { entity: { id: oid2 } }, payment: { entity: { id: 'pay_2' } } } });
  calls.length = 0;
  r = await call(require('../api/razorpay-webhook'), null, { raw: evt2, headers: { 'x-razorpay-signature': sign(evt2, 'whsec') } });
  assert.equal(r.status, 200);
  assert.equal(srOrders[srOrders.length - 1].req.order_items[0].sku, 'TOPCOAT');
  assert.match(crmLeads().pop().description, /Confirmed by: webhook/);

  // amount mismatch is flagged in the CRM, not silently shipped
  r = await call(require('../api/create-order'), { items: [{ pid: 'superfirst-top-coat', vid: '1-5-kg-kit', qty: 1 }], payment: 'razorpay', customer });
  const oid3 = r.data.razorpay.orderId;
  rzOrders[oid3].status = 'paid'; rzOrders[oid3].amount_paid = 100; rzOrders[oid3].amount = 100;
  calls.length = 0;
  await call(require('../api/verify-payment'), { razorpay_order_id: oid3, razorpay_payment_id: 'pay_3', razorpay_signature: sign(`${oid3}|pay_3`, 'sek') });
  assert.match(crmLeads().pop().description, /AMOUNT MISMATCH/);

  // Shiprocket down → customer still gets their order; CRM lead says to ship by hand
  srFail = true; calls.length = 0;
  r = await call(require('../api/create-order'), { items, payment: 'cod', customer });
  assert.equal(r.status, 200);
  assert.match(crmLeads().pop().description, /Shiprocket order NOT created automatically \(Wrong Pickup location entered\)/);
  srFail = false;
  assert.equal(srLogins, 1, 'Shiprocket token reused');

  // sold-out sizes can't be ordered
  const C = require('../data/catalog.js');
  const v = C.findVariant(C.findProduct('superfirst-art-resin'), '1-5-kg'); v.inStock = false;
  assert.equal(C.computeTotals([{ pid: 'superfirst-art-resin', vid: '1-5-kg', qty: 1 }]).lines.length, 0);
  v.inStock = true;

  process.stdout.write('All API tests passed ✓  (leads, Razorpay, webhook, Shiprocket, tracking)\n');
})().catch((e) => { process.stdout.write('FAILED: ' + e.stack + '\n'); process.exit(1); });
