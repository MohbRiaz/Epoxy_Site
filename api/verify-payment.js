/* POST /api/verify-payment — the customer's browser reports a successful payment.
   We check Razorpay's signature, then complete the order from Razorpay's own record. */
const crypto = require('crypto');
const { readBody, send } = require('./_lib/http');
const { completePaidOrder } = require('./_lib/paid');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  const b = await readBody(req);
  const { razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: sig } = b;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !oid || !pid || !sig) return send(res, 400, { error: 'Missing payment details.' });
  const expected = crypto.createHmac('sha256', secret).update(`${oid}|${pid}`).digest('hex');
  if (expected.length !== String(sig).length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(sig))))
    return send(res, 400, { error: 'Payment signature did not match.' });
  try {
    const r = await completePaidOrder(oid, pid, 'checkout');
    return send(res, 200, { ok: true, orderRef: r.orderRef });
  } catch (e) {
    console.error('[verify-payment]', e.message);
    return send(res, 502, { error: 'Payment received; confirmation is delayed.' });
  }
};
