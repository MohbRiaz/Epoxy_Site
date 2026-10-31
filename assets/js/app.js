/* =====================================================================
   THE EPOXY STUDIO — shared site script (header, footer, cart, forms)
   ===================================================================== */

/* ---------- 1. EDIT THESE ---------- */
const SITE = {
  whatsapp: '91XXXXXXXXXX',               // your WhatsApp business number, country code first, digits only
  email: 'hello@theepoxystudio.in',
  instagram: 'https://www.instagram.com/',
  youtube: 'https://www.youtube.com/',
  facebook: 'https://www.facebook.com/',
  city: 'Bengaluru',
  api: '/api'                             // serverless functions folder (leave as is on Vercel)
};

/* ---------- 2. helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const C = window.CATALOG;
const inr = (n) => '₹' + Number(n).toLocaleString('en-IN', Number.isInteger(+n) ? {} : { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const waLink = (text) => `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;

const ICON = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 7h14l-1.5 12h-11z"/><path d="M9 7a3 3 0 016 0"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>',
  returns: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v4h4"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l1.5-4A8 8 0 1 1 8 18.5z"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="M10 9v6l5-3z" fill="currentColor"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V21M6 11h8"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>'
};

/* coloured placeholder image (until you add real photos) */
function ph(color, label, w = 800, h = 800) {
  const dark = (() => { const c = color.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.substr(i, 2), 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.35; })();
  const fs = Math.max(14, Math.min(30, Math.round(w / 18)));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" fill="${dark ? '#FFFFFF' : '#2B3138'}" opacity=".7" font-family="sans-serif" font-size="${fs}" text-anchor="middle" dominant-baseline="middle">${esc(label)}</text></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}
function productImage(p, i = 0, label) {
  if (p.images && p.images[i]) return p.images[i];
  return ph(p.tint || '#E3F1F1', label || p.name.replace('SuperFirst ', ''));
}
function fillPlaceholders(root = document) {
  $$('img[data-ph]', root).forEach((img) => {
    if (img.getAttribute('src')) return;
    const [color, label, w, h] = img.dataset.ph.split('|');
    img.src = ph(color, label, +w || 800, +h || 800);
  });
}

/* ---------- 3. header & footer ---------- */
function renderChrome() {
  const page = document.body.dataset.page || '';
  // main menu = every artist category that has products, then Learn and the calculator
  const nav = [
    ...C.categories.filter((c) => !c.business && C.hasProducts(c.id)).map((c) => [`shop.html?cat=${c.id}`, c.name, c.id]),
    ['learn.html', 'Learn & Workshops', 'learn'],
    ['calculator.html', 'Resin Calculator', 'calculator']
  ];
  const shopLinks = C.categories.filter((c) => !c.business && C.hasProducts(c.id)).map((c) => `<li><a href="shop.html?cat=${c.id}">${esc(c.name)}</a></li>`).join('');
  const bizLinks = C.categories.filter((c) => c.business && C.hasProducts(c.id)).map((c) => `<li><a href="shop.html?cat=${c.id}">${esc(c.name)}</a></li>`).join('');
  const currentCat = new URLSearchParams(location.search).get('cat');
  const h = $('#site-header');
  if (h) h.innerHTML = `
    <div class="announce" role="region" aria-label="Offers">
      <span>Free shipping on every order</span>
      <span>10% off your first pour with code <strong>NEW10</strong></span>
      <span>Easy 7-day returns</span>
    </div>
    <header class="site-header">
      <div class="wrap">
        <button class="icon-btn menu-btn" id="menuBtn" aria-label="Open menu" aria-expanded="false" aria-controls="mainNav">${ICON.menu}</button>
        <a class="brand" href="index.html">The Epoxy Studio<b>.</b></a>
        <nav class="main-nav" id="mainNav" aria-label="Main">
          ${nav.map(([href, label, key]) => {
            const cur = (page === 'shop' && key === currentCat) || page === key;
            return `<a href="${href}"${key === 'calculator' ? ' class="calc"' : ''}${cur ? ' aria-current="page"' : ''}>${label}</a>`;
          }).join('')}
        </nav>
        <div class="header-actions">
          <button class="cart-btn" id="cartBtn" aria-label="Open cart">${ICON.bag}<span id="cartCount">0</span></button>
        </div>
      </div>
    </header>`;

  const f = $('#site-footer');
  if (f) f.innerHTML = `
    <footer class="site-footer">
      <div class="wrap">
        <div class="footer-grid">
          <div>
            <a class="brand" href="index.html">The Epoxy Studio<b>.</b></a>
            <p class="muted" style="font-size:14px;max-width:26em">Home of SuperFirst resin. Made for artists, tested in our ${SITE.city} studio.</p>
            <div class="social">
              <a href="${SITE.instagram}" aria-label="Instagram">${ICON.instagram}</a>
              <a href="${SITE.youtube}" aria-label="YouTube">${ICON.youtube}</a>
              <a href="${SITE.facebook}" aria-label="Facebook">${ICON.facebook}</a>
            </div>
          </div>
          <div><h2>Shop</h2><ul>${shopLinks}<li><a href="shop.html">All products</a></li></ul></div>
          <div><h2>Learn</h2><ul>
            <li><a href="calculator.html">Resin calculator</a></li>
            <li><a href="learn.html#workshops">Workshops</a></li>
            <li><a href="learn.html">Tutorials</a></li></ul></div>
          <div><h2>Help</h2><ul>
            <li><a href="track.html">Track my order</a></li>
            <li><a href="contact.html">Contact us</a></li>
            <li><a href="policies.html#shipping">Shipping</a></li>
            <li><a href="policies.html#returns">Returns &amp; refunds</a></li>
            <li><a href="policies.html#privacy">Privacy</a></li></ul></div>
          <div><h2>For business</h2><ul>${bizLinks}
            <li><a href="contact.html?type=bulk">Bulk &amp; reseller orders</a></li></ul></div>
        </div>
        <div class="footer-base">
          <span>© ${new Date().getFullYear()} The Epoxy Studio™</span>
          <span>UPI, cards, net banking and cash on delivery</span>
        </div>
      </div>
    </footer>
    <a class="wa-float" href="${waLink('Hi! I have a question about resin.')}" aria-label="Chat on WhatsApp">${ICON.whatsapp}</a>
    <div class="drawer-backdrop" id="drawerBackdrop"></div>
    <aside class="drawer" id="cartDrawer" role="dialog" aria-modal="true" aria-labelledby="cartTitle">
      <div class="drawer-head"><h2 id="cartTitle">Your cart</h2><button class="icon-btn" id="cartClose" aria-label="Close cart">${ICON.close}</button></div>
      <div class="drawer-body" id="cartLines"></div>
      <div class="drawer-foot" id="cartFoot"></div>
    </aside>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>`;

  const menuBtn = $('#menuBtn'), mainNav = $('#mainNav');
  menuBtn?.addEventListener('click', () => {
    const open = mainNav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.innerHTML = open ? ICON.close : ICON.menu;
  });
  $('#cartBtn')?.addEventListener('click', openCart);
  $('#cartClose')?.addEventListener('click', closeCart);
  $('#drawerBackdrop')?.addEventListener('click', closeCart);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('drawer-open')) closeCart(); });
}

/* ---------- 4. cart ---------- */
const Cart = {
  key: 'tes-cart',
  get() { try { return JSON.parse(localStorage.getItem(this.key)) || []; } catch { return []; } },
  set(items) { try { localStorage.setItem(this.key, JSON.stringify(items)); } catch {} renderCart(); },
  add(pid, vid, qty = 1) {
    const items = this.get();
    const hit = items.find((i) => i.pid === pid && i.vid === vid);
    if (hit) hit.qty = Math.min(50, hit.qty + qty); else items.push({ pid, vid, qty });
    this.set(items);
  },
  update(pid, vid, qty) {
    let items = this.get();
    if (qty <= 0) items = items.filter((i) => !(i.pid === pid && i.vid === vid));
    else items.forEach((i) => { if (i.pid === pid && i.vid === vid) i.qty = Math.min(50, qty); });
    this.set(items);
  },
  clear() { this.set([]); },
  count() { return C.computeTotals(this.get()).lines.reduce((a, l) => a + l.qty, 0); }
};

let lastFocus = null;
function openCart() { lastFocus = document.activeElement; renderCart(); document.body.classList.add('drawer-open'); setTimeout(() => $('#cartClose')?.focus(), 50); }
function closeCart() { document.body.classList.remove('drawer-open'); lastFocus?.focus?.(); }

function renderCart() {
  const countEl = $('#cartCount'); if (countEl) countEl.textContent = Cart.count();
  const linesEl = $('#cartLines'), footEl = $('#cartFoot');
  if (!linesEl) return;
  const t = C.computeTotals(Cart.get());
  if (!t.lines.length) {
    linesEl.innerHTML = `<div class="empty"><p>Your cart is empty.</p><a class="btn btn-primary" href="shop.html">Start shopping</a></div>`;
    footEl.innerHTML = '';
    return;
  }
  linesEl.innerHTML = t.lines.map((l) => {
    const p = C.findProduct(l.pid);
    return `<div class="line">
      <img src="${productImage(p)}" alt="">
      <div>
        <a class="name" href="product.html?id=${l.pid}">${esc(l.name)}</a>
        <div class="meta">${esc(l.variant)} · ${inr(l.unit)}</div>
        <div class="qty" role="group" aria-label="Quantity for ${esc(l.name)}">
          <button data-q="-1" data-pid="${l.pid}" data-vid="${l.vid}" aria-label="Decrease">−</button><span>${l.qty}</span><button data-q="1" data-pid="${l.pid}" data-vid="${l.vid}" aria-label="Increase">+</button>
        </div>
      </div>
      <div style="text-align:right"><strong>${inr(l.total)}</strong><br><button class="remove" data-rm data-pid="${l.pid}" data-vid="${l.vid}">Remove</button></div>
    </div>`;
  }).join('');
  footEl.innerHTML = `
    <div class="totals"><span>Subtotal</span><strong>${inr(t.subtotal)}</strong></div>
    <p class="ship-note">${t.shipping ? `Shipping ${inr(t.shipping)}` : 'Free shipping included.'} Apply NEW10 at checkout for 10% off your first order.</p>
    <a class="btn btn-primary btn-block" href="checkout.html">Checkout</a>
    <a class="btn btn-outline btn-block" href="${waLink(orderText(t))}">Order on WhatsApp instead</a>`;
  linesEl.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => {
    const it = Cart.get().find((i) => i.pid === b.dataset.pid && i.vid === b.dataset.vid);
    Cart.update(b.dataset.pid, b.dataset.vid, (it?.qty || 0) + Number(b.dataset.q));
  }));
  linesEl.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => Cart.update(b.dataset.pid, b.dataset.vid, 0)));
}
function orderText(t, extra = '') {
  return `Hi! I'd like to order:\n${t.lines.map((l) => `• ${l.name} (${l.variant}) × ${l.qty} = ${inr(l.total)}`).join('\n')}\nTotal: ${inr(t.total)}${extra}`;
}

function toast(msg) {
  const el = $('#toast'); if (!el) return;
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ---------- delivery estimate (Shiprocket) ---------- */
async function deliveryCheck(pincode, kg = 0.5) {
  if (!/^[1-9][0-9]{5}$/.test(pincode)) return null;
  try {
    const r = await fetch(`${SITE.api}/shipping?pincode=${pincode}&kg=${kg}`);
    const d = await r.json();
    return d.configured === false || d.error ? null : d;
  } catch { return null; }
}
function deliveryText(d) {
  if (!d) return '';
  if (!d.serviceable) return "Sorry, we don't deliver to this PIN code yet — message us on WhatsApp.";
  let when = '';
  if (d.etd) { const t = new Date(d.etd.replace(' ', 'T')); if (!isNaN(t)) when = `by ${t.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`; }
  if (!when && d.days) when = `in about ${d.days} day${d.days > 1 ? 's' : ''}`;
  return `✓ Delivers ${when || 'to this PIN'}${d.cod ? ' · Cash on delivery available' : ' · Prepaid only'}`;
}

/* ---------- 5. product card (used by home + shop) ---------- */
function productCard(p) {
  const inStock = C.inStock(p);
  const avail = p.variants.filter((x) => x.inStock !== false);
  const v = (avail.length ? avail : p.variants).slice().sort((a, b) => a.price - b.price)[0];
  const from = p.variants.length > 1 ? 'From ' : '';
  const stars = p.rating ? `<span class="stars"><b>★</b> ${p.rating} · ${p.reviews} reviews</span>` : '';
  const facts = p.facts ? `<div class="chips"><span class="chip">Ratio ${esc(p.facts.ratio)}</span>${p.facts.maxDepthMm ? `<span class="chip chip--gold">Up to ${p.facts.maxDepthMm} mm</span>` : ''}</div>` : '';
  const btn = !inStock
    ? `<button class="btn btn-outline btn-block" disabled>Sold out</button>`
    : p.variants.length > 1
    ? `<a class="btn btn-outline btn-block" href="product.html?id=${p.id}">Choose size</a>`
    : `<button class="btn btn-primary btn-block" data-add="${p.id}" data-vid="${v.id}">Add to cart</button>`;
  return `<article class="card product-card">
    <div class="media-wrap"><img class="media ar-45" src="${productImage(p)}" alt="${esc(p.name)}" loading="lazy">${!inStock ? '<span class="badge" style="background:#5B636B">Sold out</span>' : p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ''}</div>
    <div class="card-body">
      <span class="type">${esc(p.type)}</span>
      <h3 class="h3"><a href="product.html?id=${p.id}">${esc(p.name)}</a></h3>
      <span class="sub">${esc(p.short)}</span>
      ${facts}${stars}
      <div class="price"><strong>${from}${inr(v.price)}</strong>${v.mrp > v.price ? `<span class="strike">${inr(v.mrp)}</span>` : ''}</div>
      ${btn}
    </div>
  </article>`;
}
function wireAddButtons(root = document) {
  $$('[data-add]', root).forEach((b) => b.addEventListener('click', () => {
    Cart.add(b.dataset.add, b.dataset.vid, 1);
    toast('Added to cart');
  }));
}

/* ---------- 6. lead forms → /api/lead → Odoo CRM ----------
   Any <form data-lead="type"> is sent automatically.
   Hidden honeypot field "company_website" blocks bots. */
async function sendLead(payload) {
  const res = await fetch(`${SITE.api}/lead`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, page: location.pathname + location.search, utm: getUtm() })
  });
  if (!res.ok) throw new Error('lead failed');
  return res.json();
}
function getUtm() {
  const q = new URLSearchParams(location.search); const keep = {};
  ['utm_source', 'utm_medium', 'utm_campaign'].forEach((k) => { const v = q.get(k) || sessionStorage.getItem(k); if (v) { keep[k] = v; sessionStorage.setItem(k, v); } });
  return keep;
}
function wireLeadForms() {
  $$('form[data-lead]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = $('.form-msg', form);
      const btn = $('button[type="submit"]', form);
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const data = Object.fromEntries(new FormData(form).entries());
      btn && (btn.disabled = true);
      try {
        await sendLead({ type: form.dataset.lead, ...data });
        form.reset();
        if (msg) { msg.className = 'form-msg ok'; msg.textContent = form.dataset.success || "Thanks! We'll be in touch soon."; }
      } catch {
        if (msg) { msg.className = 'form-msg err'; msg.innerHTML = `That didn't go through. Please <a href="${waLink('Hi! I tried to send a message on your website.')}">message us on WhatsApp</a> instead.`; }
      } finally { btn && (btn.disabled = false); }
    });
  });
}

/* ---------- broken photo → coloured placeholder ---------- */
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || img.dataset.fallback) return;
  img.dataset.fallback = '1';
  img.src = ph('#E3F1F1', img.alt ? img.alt.replace('SuperFirst ', '').slice(0, 28) : 'Photo coming soon');
}, true);

/* ---------- boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  renderChrome();
  renderCart();
  fillPlaceholders();
  wireLeadForms();
  getUtm();
  window.addEventListener('storage', (e) => { if (e.key === Cart.key) renderCart(); });
});
