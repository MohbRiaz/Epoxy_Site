/* small helpers for Vercel serverless functions.
   Works with Vercel's body helpers ON or OFF (set NODEJS_HELPERS=0 so the
   Razorpay webhook can read the exact raw body for its signature check). */
async function readRaw(req) {
  if (typeof req.rawBody === 'string') return req.rawBody;
  if (req.body !== undefined && req.readableEnded !== false) {
    return typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  }
  const chunks = [];
  for await (const c of req) chunks.push(typeof c === 'string' ? Buffer.from(c) : c);
  req.rawBody = Buffer.concat(chunks).toString('utf8');
  return req.rawBody;
}
async function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  try { return JSON.parse(await readRaw(req) || '{}'); } catch { return {}; }
}
function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}
function query(req) { return Object.fromEntries(new URL(req.url || '/', 'http://x').searchParams); }
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || ''));
const digits = (v) => String(v || '').replace(/\D/g, '');
const isPhone = (v) => digits(v).length >= 10;
const isPincode = (v) => /^[1-9][0-9]{5}$/.test(String(v || ''));
module.exports = { readRaw, readBody, send, query, isEmail, isPhone, isPincode, digits };
