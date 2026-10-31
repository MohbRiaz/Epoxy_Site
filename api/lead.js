/* POST /api/lead — newsletter, contact, bulk, workshop forms */
const { readBody, send, isEmail, isPhone } = require('./_lib/http');
const { pushLead } = require('./_lib/leads');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  const b = await readBody(req);
  if (b.company_website) return send(res, 200, { ok: true });           // bot filled the honeypot
  if (!b.email && !b.phone) return send(res, 400, { error: 'Please add an email or phone number.' });
  if (b.email && !isEmail(b.email)) return send(res, 400, { error: 'Please check your email address.' });
  if (b.phone && !isPhone(b.phone)) return send(res, 400, { error: 'Please check your phone number.' });
  await pushLead(b);
  return send(res, 200, { ok: true });
};
