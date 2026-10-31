/* GET /api/shipping?pincode=560001&cod=1&kg=0.6 — delivery estimate for a PIN code */
const { send, query, isPincode } = require('./_lib/http');
const shiprocket = require('./_lib/shiprocket');

module.exports = async (req, res) => {
  const q = query(req);
  if (!shiprocket.enabled()) return send(res, 200, { configured: false });
  if (!isPincode(q.pincode)) return send(res, 400, { error: 'Enter a 6-digit PIN code.' });
  try {
    const [prepaid, cod] = await Promise.all([
      shiprocket.checkService(q.pincode, { cod: false, weightKg: +q.kg || 0.5 }),
      shiprocket.checkService(q.pincode, { cod: true, weightKg: +q.kg || 0.5 }).catch(() => ({ serviceable: false }))
    ]);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return send(res, 200, { configured: true, serviceable: prepaid.serviceable || cod.serviceable, cod: !!cod.serviceable, days: prepaid.days || cod.days || null, etd: prepaid.etd || cod.etd || null });
  } catch (e) {
    console.error('[shipping]', e.message);
    return send(res, 200, { configured: true, error: 'unavailable' });
  }
};
