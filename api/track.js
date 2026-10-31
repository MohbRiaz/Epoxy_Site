/* GET /api/track?ref=TES-XXXX&phone=9876543210 — order status from Shiprocket.
   The phone number must match the order, so nobody can look up other people's orders. */
const { send, query, isPhone } = require('./_lib/http');
const shiprocket = require('./_lib/shiprocket');

module.exports = async (req, res) => {
  const q = query(req);
  const ref = String(q.ref || '').trim().toUpperCase();
  if (!/^TES-[A-Z0-9]{4,20}$/.test(ref) || !isPhone(q.phone)) return send(res, 400, { error: 'Enter your order number (starts with TES-) and the mobile number you ordered with.' });
  if (!shiprocket.enabled()) return send(res, 200, { configured: false });
  try {
    const t = await shiprocket.trackOrder(ref, q.phone);
    if (!t) return send(res, 404, { error: "We couldn't find an order with that number and phone. It can take a few minutes for a new order to appear." });
    return send(res, 200, { configured: true, ...t });
  } catch (e) {
    console.error('[track]', e.message);
    return send(res, 502, { error: 'Tracking is temporarily unavailable. Please try again shortly.' });
  }
};
