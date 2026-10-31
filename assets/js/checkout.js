/* Checkout: Razorpay (online) or cash on delivery.
   Server recalculates every price — the browser total is only a preview. */
document.addEventListener('DOMContentLoaded', async () => {
  const STATES = ['Andaman and Nicobar Islands','Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chandigarh','Chhattisgarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jammu and Kashmir','Jharkhand','Karnataka','Kerala','Ladakh','Lakshadweep','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Puducherry','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal'];
  $('#state').innerHTML = '<option value="">Select state</option>' + STATES.map((s) => `<option>${s}</option>`).join('');

  let coupon = sessionStorage.getItem('tes-coupon') || '';
  let online = true;
  let pinCod = true;          // set from Shiprocket when the customer types a PIN

  // Ask the server whether online payment is set up
  try {
    const r = await fetch(`${SITE.api}/config`);
    const cfg = r.ok ? await r.json() : null;
    online = !!cfg?.razorpay;
  } catch { online = false; }
  if (!online) {
    $('#optOnline').hidden = true;
    $('#optCod input').checked = true;
    $('#payNotice').hidden = false;
    $('#payNotice').textContent = 'Online payment is being set up. You can order with cash on delivery, or send your order on WhatsApp.';
  }

  const payMethod = () => ($('input[name="payment"]:checked') || {}).value;

  const render = () => {
    const items = Cart.get();
    const t = C.computeTotals(items, coupon, payMethod());
    if (!t.lines.length) { $('#checkoutWrap').hidden = true; $('#emptyMsg').hidden = false; return t; }
    $('#sumLines').innerHTML = t.lines.map((l) => {
      const p = C.findProduct(l.pid);
      return `<div class="line" style="grid-template-columns:56px 1fr auto;padding:10px 0"><img src="${productImage(p)}" alt="" style="width:56px;height:56px"><div><span class="name">${esc(l.name)}</span><div class="meta">${esc(l.variant)} × ${l.qty}</div></div><strong>${inr(l.total)}</strong></div>`;
    }).join('');
    $('#sumTotals').innerHTML = `
      <div class="totals"><span>Subtotal</span><span>${inr(t.subtotal)}</span></div>
      ${t.discount ? `<div class="totals" style="color:var(--teal-dark)"><span>Discount (${t.coupon})</span><span>−${inr(t.discount)}</span></div>` : ''}
      <div class="totals"><span>Shipping</span><span>${t.shipping ? inr(t.shipping) : 'Free'}</span></div>
      ${t.codFee ? `<div class="totals"><span>Cash on delivery fee</span><span>${inr(t.codFee)}</span></div>` : ''}
      <div class="totals grand"><span>Total</span><span>${inr(t.total)}</span></div>`;
    const codMax = C.store.codMaxOrder;
    const codBlocked = (codMax && t.total > codMax) || !pinCod;
    $('#optCod').hidden = codBlocked;
    if (codBlocked && payMethod() === 'cod' && online) $('#optOnline input').checked = true;
    $('#codNote').textContent = C.store.codFee ? `Pay when it arrives (+${inr(C.store.codFee)})` : 'Pay when your order arrives';
    $('#placeBtn').textContent = payMethod() === 'cod' ? `Place order — ${inr(t.total)}` : `Pay ${inr(t.total)}`;
    if (!online && codBlocked) { $('#placeBtn').hidden = true; showWhatsApp(t, !pinCod ? 'Cash on delivery isn\'t available for this PIN code. Please send your order on WhatsApp and we\'ll arrange payment.' : 'Orders above ' + inr(codMax) + ' need online payment, which is being set up. Please send your order on WhatsApp.'); }
    else { $('#placeBtn').hidden = false; }
    return t;
  };

  const applyCoupon = () => {
    const code = $('#coupon').value.trim().toUpperCase();
    if (!code) return;
    if (C.coupons[code]) { coupon = code; sessionStorage.setItem('tes-coupon', code); $('#couponMsg').className = 'form-msg ok'; $('#couponMsg').textContent = `${code} applied — ${C.coupons[code].label}.`; }
    else { $('#couponMsg').className = 'form-msg err'; $('#couponMsg').textContent = `"${code}" isn't a valid code.`; }
    render();
  };
  $('#applyCoupon').addEventListener('click', applyCoupon);
  $('#coupon').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); } });
  if (coupon) { $('#coupon').value = coupon; $('#couponMsg').className = 'form-msg ok'; $('#couponMsg').textContent = `${coupon} applied.`; }
  $$('input[name="payment"]').forEach((i) => i.addEventListener('change', render));
  render();

  // Delivery estimate + COD availability for the PIN code (when Shiprocket is connected)
  let pinTimer;
  $('#pincode').addEventListener('input', (e) => {
    clearTimeout(pinTimer);
    const pin = e.target.value.replace(/\D/g, '').slice(0, 6);
    if (pin.length < 6) { $('#pinMsg').textContent = ''; pinCod = true; render(); return; }
    pinTimer = setTimeout(async () => {
      $('#pinMsg').textContent = 'Checking delivery…';
      const d = await deliveryCheck(pin, 0.5 + Cart.count() * 0.5);
      $('#pinMsg').textContent = deliveryText(d);
      $('#pinMsg').style.color = d && !d.serviceable ? 'var(--danger)' : '';
      pinCod = !d || !!d.cod;
      render();
    }, 350);
  });

  function customer() {
    const d = Object.fromEntries(new FormData($('#coForm')).entries());
    return { name: d.name, phone: d.phone, email: d.email, address: d.address, city: d.city, state: d.state, pincode: d.pincode, notes: d.notes, company_website: d.company_website };
  }
  function showWhatsApp(t, message) {
    const c = customer();
    const extra = `\n\nName: ${c.name || ''}\nPhone: ${c.phone || ''}\nAddress: ${[c.address, c.city, c.state, c.pincode].filter(Boolean).join(', ')}${t.coupon ? `\nCoupon: ${t.coupon}` : ''}`;
    const a = $('#waOrder'); a.hidden = false; a.href = waLink(orderText(t, extra));
    if (message) { $('#coMsg').className = 'form-msg err'; $('#coMsg').textContent = message; }
  }
  function done(orderRef, t, method) {
    sessionStorage.setItem('tes-last-order', JSON.stringify({ ref: orderRef, total: t.total, method, lines: t.lines }));
    sessionStorage.removeItem('tes-coupon');
    Cart.clear();
    location.href = `order-success.html?ref=${encodeURIComponent(orderRef)}`;
  }
  function loadRazorpay() {
    return new Promise((ok, fail) => {
      if (window.Razorpay) return ok();
      const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = ok; s.onerror = fail; document.head.appendChild(s);
    });
  }

  $('#coForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const method = payMethod();
    const t = render();
    const btn = $('#placeBtn'); btn.disabled = true; const label = btn.textContent; btn.textContent = 'Please wait…';
    $('#coMsg').textContent = '';
    const body = { items: Cart.get(), coupon, payment: method, customer: customer(), utm: getUtm() };
    try {
      const r = await fetch(`${SITE.api}/create-order`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const res = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(res.error || 'order failed');

      if (method === 'cod') return done(res.orderRef, res.totals || t, 'cod');

      await loadRazorpay();
      const c = body.customer;
      const rzp = new window.Razorpay({
        key: res.razorpay.keyId,
        amount: res.razorpay.amount,
        currency: 'INR',
        name: 'The Epoxy Studio',
        description: `Order ${res.orderRef}`,
        order_id: res.razorpay.orderId,
        prefill: { name: c.name, email: c.email, contact: c.phone },
        notes: { orderRef: res.orderRef },
        theme: { color: '#0A6A70' },
        handler: async (pay) => {
          try {
            const v = await fetch(`${SITE.api}/verify-payment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...pay, orderRef: res.orderRef, ...body }) });
            if (!v.ok) throw new Error();
            done(res.orderRef, res.totals || t, 'online');
          } catch {
            $('#coMsg').className = 'form-msg err';
            $('#coMsg').textContent = `Payment received but we couldn't confirm it automatically. Please WhatsApp us your order number ${res.orderRef} — you won't be charged twice.`;
            btn.disabled = false; btn.textContent = label;
          }
        },
        modal: { ondismiss: () => { btn.disabled = false; btn.textContent = label; } }
      });
      rzp.on('payment.failed', (f) => { $('#coMsg').className = 'form-msg err'; $('#coMsg').textContent = `Payment failed: ${f.error?.description || 'please try again or choose cash on delivery.'}`; });
      rzp.open();
    } catch (err) {
      btn.disabled = false; btn.textContent = label;
      showWhatsApp(t, err.message && err.message !== 'order failed' && !/fetch/i.test(err.message) ? err.message : "We couldn't place your order online. Send it on WhatsApp and we'll confirm it right away.");
    }
  });
});
