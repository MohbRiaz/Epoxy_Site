/* POST /api/razorpay-webhook — Razorpay calls this when an order is paid.
   Backup for customers who close the page right after paying.
   Set up in Razorpay → Settings → Webhooks → URL https://YOUR-SITE/api/razorpay-webhook,
   event "order.paid", and the same secret as RAZORPAY_WEBHOOK_SECRET. */
const crypto = require('crypto');
const { readRaw, send } = require('./_lib/http');
const { completePaidOrder } = require('./_lib/paid');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return send(res, 503, { error: 'Webhook secret not set' });
  const raw = await readRaw(req);
  const sig = String(req.headers['x-razorpay-signature'] || '');
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  if (!sig || expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
    console.error('[razorpay-webhook] bad signature — if this keeps happening, set NODEJS_HELPERS=0 in Vercel');
    return send(res, 400, { error: 'Bad signature' });
  }
  let evt; try { evt = JSON.parse(raw); } catch { return send(res, 400, { error: 'Bad JSON' }); }
  if (evt.event !== 'order.paid') return send(res, 200, { ignored: evt.event });
  const orderId = evt.payload?.order?.entity?.id;
  const paymentId = evt.payload?.payment?.entity?.id;
  try {
    const r = await completePaidOrder(orderId, paymentId, 'webhook');
    return send(res, 200, { ok: true, ...r, totals: undefined });
  } catch (e) {
    console.error('[razorpay-webhook]', e.message);
    return send(res, 500, { error: 'retry' });    // Razorpay retries automatically
  }
};
