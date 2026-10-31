/* Sends every lead / order to:
   1. Odoo CRM (crm.lead)        — if ODOO_URL, ODOO_DB, ODOO_USER, ODOO_API_KEY are set
   2. Any webhook (Zapier, Make, Google Sheets script …) — if LEAD_WEBHOOK_URL is set
   3. The server log            — always (visible in Vercel → Logs)
   Nothing else in the site needs to change when you connect Odoo. */

const TYPE_LABEL = {
  newsletter: 'Newsletter sign-up',
  contact: 'Website enquiry',
  workshop: 'Workshop booking',
  order: 'Website order'
};

async function odooCall(service, method, args) {
  const res = await fetch(`${process.env.ODOO_URL.replace(/\/$/, '')}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: { service, method, args }, id: Date.now() })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.data?.message || data.error.message || 'Odoo error');
  return data.result;
}

let cachedUid = null;
async function createOdooLead(vals) {
  const { ODOO_DB, ODOO_USER, ODOO_API_KEY } = process.env;
  if (!cachedUid) cachedUid = await odooCall('common', 'login', [ODOO_DB, ODOO_USER, ODOO_API_KEY]);
  if (!cachedUid) throw new Error('Odoo login failed — check ODOO_USER and ODOO_API_KEY');
  return odooCall('object', 'execute_kw', [ODOO_DB, cachedUid, ODOO_API_KEY, 'crm.lead', 'create', [vals]]);
}

const rs = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(+n) ? 0 : 2, maximumFractionDigits: 2 });
const clean = (v, max = 2000) => (v == null ? '' : String(v).trim().slice(0, max));

/* lead = { type, name, email, phone, company, message, ...anything }  */
async function pushLead(lead) {
  const type = TYPE_LABEL[lead.type] ? lead.type : 'contact';
  const name = clean(lead.name, 120);
  const known = ['type', 'name', 'email', 'phone', 'company', 'message', 'company_website', 'page', 'utm', 'expected_revenue', 'title', 'address', 'city', 'state', 'pincode'];
  const extras = Object.entries(lead).filter(([k, v]) => !known.includes(k) && v !== '' && v != null && typeof v !== 'object');
  const lines = [
    clean(lead.message, 5000),
    ...extras.map(([k, v]) => `${k.replace(/_/g, ' ')}: ${clean(v, 500)}`),
    lead.page ? `Page: ${clean(lead.page, 300)}` : '',
    lead.utm && Object.keys(lead.utm).length ? `Campaign: ${Object.entries(lead.utm).map(([k, v]) => `${k}=${clean(v, 100)}`).join(', ')}` : ''
  ].filter(Boolean);

  const vals = {
    name: clean(lead.title, 200) || `${TYPE_LABEL[type]}${name ? ' — ' + name : ''}`,
    contact_name: name || false,
    email_from: clean(lead.email, 200) || false,
    phone: clean(lead.phone, 40) || false,
    partner_name: clean(lead.company, 200) || false,
    street: clean(lead.address, 300) || false,
    city: clean(lead.city, 100) || false,
    zip: clean(lead.pincode, 12) || false,
    description: lines.join('\n'),
    expected_revenue: Number(lead.expected_revenue) || 0
  };

  const results = { odoo: null, webhook: null };
  console.log('[lead]', JSON.stringify({ ...vals, description: vals.description.slice(0, 500) }));

  if (process.env.ODOO_URL && process.env.ODOO_DB && process.env.ODOO_USER && process.env.ODOO_API_KEY) {
    try { results.odoo = await createOdooLead(vals); }
    catch (e) { cachedUid = null; console.error('[lead] Odoo failed:', e.message); }
  }
  if (process.env.LEAD_WEBHOOK_URL) {
    try {
      const r = await fetch(process.env.LEAD_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, ...vals, received_at: new Date().toISOString() }) });
      results.webhook = r.ok;
    } catch (e) { console.error('[lead] webhook failed:', e.message); }
  }
  return results;
}

/* Turn an order into a readable CRM note */
function orderLead({ orderRef, totals, customer, payment, status, utm }) {
  const items = totals.lines.map((l) => `• ${l.name} (${l.variant})${l.sku ? ` [SKU ${l.sku}]` : ''} × ${l.qty} = ${rs(l.total)}`).join('\n');
  return {
    type: 'order',
    title: `${status === 'paid' ? 'PAID' : 'COD'} order ${orderRef} — ${rs(totals.total)} — ${clean(customer.name, 80)}`,
    name: customer.name, email: customer.email, phone: customer.phone,
    address: customer.address, city: customer.city, state: customer.state, pincode: customer.pincode,
    expected_revenue: totals.total,
    message: [
      `Order: ${orderRef}`,
      `Payment: ${payment === 'cod' ? 'Cash on delivery' : 'Paid online (Razorpay)'}${status === 'mismatch' ? ' — ⚠ AMOUNT MISMATCH, check in Razorpay before shipping' : ''}`,
      '', items, '',
      `Subtotal: ${rs(totals.subtotal)}`,
      totals.discount ? `Discount (${totals.coupon}): −${rs(totals.discount)}` : '',
      `Shipping: ${totals.shipping ? rs(totals.shipping) : 'Free'}`,
      totals.codFee ? `COD fee: ${rs(totals.codFee)}` : '',
      `TOTAL: ${rs(totals.total)}`, '',
      `Ship to: ${[customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(', ')}`,
      customer.notes ? `Notes: ${customer.notes}` : ''
    ].filter((x) => x !== '').join('\n'),
    utm
  };
}

module.exports = { pushLead, orderLead, clean };
