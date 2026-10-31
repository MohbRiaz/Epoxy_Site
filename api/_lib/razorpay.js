/* Razorpay REST helpers. The cart and delivery address are stored in the
   Razorpay order's "notes", so the server can rebuild the order from
   Razorpay's own record (not from the customer's browser). */
const auth = () => 'Basic ' + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
const enabled = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

async function rzp(path, method = 'GET', body) {
  const r = await fetch(`https://api.razorpay.com/v1${path}`, {
    method, headers: { Authorization: auth(), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(data?.error?.description || `Razorpay ${r.status}`); e.data = data; throw e; }
  return data;
}

// Razorpay allows 15 note fields of up to 256 characters each.
const cut = (v, n = 250) => String(v ?? '').slice(0, n);
function packNotes({ orderRef, items, coupon, customer: c }) {
  const n = {
    ref: orderRef, name: cut(c.name, 100), phone: cut(c.phone, 20), email: cut(c.email, 120),
    address: cut(c.address), city: cut(c.city, 80), state: cut(c.state, 60), pincode: cut(c.pincode, 6),
    note: cut(c.notes || ''), coupon: cut(coupon || '', 30)
  };
  const enc = items.map((i) => `${i.pid}~${i.vid}~${i.qty}`);
  let k = 1, cur = '';
  for (const e of enc) {
    if ((cur + '|' + e).length > 250) { n['items' + k++] = cur; cur = e; } else cur = cur ? cur + '|' + e : e;
  }
  if (cur) n['items' + k] = cur;
  if (Object.keys(n).length > 15) throw new Error('Your cart has too many different items to pay online in one go. Please split it into two orders, or choose cash on delivery.');
  return n;
}
function unpackNotes(n = {}) {
  const items = Object.keys(n).filter((k) => /^items\d+$/.test(k)).sort((a, b) => +a.slice(5) - +b.slice(5))
    .flatMap((k) => String(n[k]).split('|').filter(Boolean)).map((s) => { const [pid, vid, qty] = s.split('~'); return { pid, vid, qty: +qty }; });
  return {
    orderRef: n.ref, coupon: n.coupon || '', items,
    customer: { name: n.name, phone: n.phone, email: n.email, address: n.address, city: n.city, state: n.state, pincode: n.pincode, notes: n.note }
  };
}

module.exports = { rzp, enabled, packNotes, unpackNotes };
