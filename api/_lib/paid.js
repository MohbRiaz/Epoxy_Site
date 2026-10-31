/* Completes a paid Razorpay order exactly once.
   Called by verify-payment (customer's browser) and razorpay-webhook (backup).
   The cart and address come from Razorpay's own copy of the order. */
const CATALOG = require('../../data/catalog.js');
const razorpay = require('./razorpay');
const { fulfilOrder } = require('./fulfil');

async function completePaidOrder(orderId, paymentId, source) {
  const order = await razorpay.rzp(`/orders/${encodeURIComponent(orderId)}`);
  const notes = order.notes || {};
  if (notes.fulfilled === '1') return { orderRef: notes.ref, already: true };
  if (order.status !== 'paid' && source === 'webhook') return { orderRef: notes.ref, skipped: 'not paid' };

  // claim the order first so a parallel call (browser + webhook) doesn't create it twice
  await razorpay.rzp(`/orders/${encodeURIComponent(orderId)}`, 'PATCH', { notes: { ...notes, fulfilled: '1' } });

  const { orderRef, items, coupon, customer } = razorpay.unpackNotes(notes);
  const totals = CATALOG.computeTotals(items, coupon, 'razorpay');
  const status = Math.round(totals.total * 100) === order.amount_paid || Math.round(totals.total * 100) === order.amount ? 'paid' : 'mismatch';
  await fulfilOrder({
    orderRef, totals, customer, payment: 'razorpay', status,
    extra: [`Razorpay payment: ${paymentId || '(see Razorpay)'}`, `Razorpay order: ${orderId}`, `Confirmed by: ${source}`]
  });
  return { orderRef, totals };
}
module.exports = { completePaidOrder };
