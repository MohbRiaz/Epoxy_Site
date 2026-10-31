/* POST /api/create-order
   Prices the cart from the catalog (never trusts browser prices).
   - Cash on delivery: checks the PIN accepts COD, then creates the Shiprocket order + CRM lead.
   - Online: creates a Razorpay order carrying the cart and address in its notes.
     The order is fulfilled after payment (verify-payment, or the webhook as backup). */
const CATALOG = require('../data/catalog.js');
const { readBody, send, isEmail, isPhone, isPincode } = require('./_lib/http');
const razorpay = require('./_lib/razorpay');
const shiprocket = require('./_lib/shiprocket');
const { fulfilOrder } = require('./_lib/fulfil');

function checkCustomer(c) {
  if (!c || !c.name || !c.address || !c.city || !c.state) return 'Please fill in your name and full address.';
  if (!isPhone(c.phone)) return 'Please enter a valid 10-digit mobile number.';
  if (!isEmail(c.email)) return 'Please enter a valid email address.';
  if (!isPincode(c.pincode)) return 'Please enter a valid 6-digit PIN code.';
  return null;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  const b = await readBody(req);
  const c = b.customer || {};
  if (c.company_website) return send(res, 400, { error: 'Could not place order.' });
  const err = checkCustomer(c);
  if (err) return send(res, 400, { error: err });

  const payment = b.payment === 'cod' ? 'cod' : 'razorpay';
  const totals = CATALOG.computeTotals(b.items, b.coupon, payment);
  if (!totals.lines.length) return send(res, 400, { error: 'Your cart is empty.' });
  const items = totals.lines.map((l) => ({ pid: l.pid, vid: l.vid, qty: l.qty }));
  const orderRef = 'TES-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 90 + 10);

  // Delivery check (only when Shiprocket is connected)
  if (shiprocket.enabled()) {
    try {
      const s = await shiprocket.checkService(c.pincode, { cod: payment === 'cod', weightKg: shiprocket.parcel(totals).weight });
      if (!s.serviceable) return send(res, 400, { error: payment === 'cod' ? 'Cash on delivery isn\'t available for this PIN code. Please pay online.' : 'Sorry, we can\'t deliver to this PIN code yet. Message us on WhatsApp and we\'ll find a way.' });
    } catch (e) { console.error('[shiprocket] serviceability check failed — continuing', e.message); }
  }

  if (payment === 'cod') {
    const max = CATALOG.store.codMaxOrder;
    if (max && totals.total > max) return send(res, 400, { error: `Cash on delivery is available on orders up to ₹${max.toLocaleString('en-IN')}. Please pay online.` });
    await fulfilOrder({ orderRef, totals, customer: c, payment, status: 'cod', utm: b.utm });
    return send(res, 200, { orderRef, totals });
  }

  if (!razorpay.enabled()) return send(res, 400, { error: 'Online payment is not available yet. Please choose cash on delivery.' });
  let notes;
  try { notes = razorpay.packNotes({ orderRef, items, coupon: totals.coupon, customer: c }); }
  catch (e) { return send(res, 400, { error: e.message }); }
  try {
    const rz = await razorpay.rzp('/orders', 'POST', { amount: Math.round(totals.total * 100), currency: 'INR', receipt: orderRef, notes });
    return send(res, 200, { orderRef, totals, razorpay: { orderId: rz.id, amount: rz.amount, keyId: process.env.RAZORPAY_KEY_ID } });
  } catch (e) {
    console.error('[razorpay] order failed', e.message);
    return send(res, 502, { error: 'Payment could not be started. Please try again or choose cash on delivery.' });
  }
};
