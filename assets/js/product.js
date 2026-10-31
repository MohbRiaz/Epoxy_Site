/* Product page.  URL: product.html?id=superfirst-standard */
document.addEventListener('DOMContentLoaded', () => {
  const id = new URLSearchParams(location.search).get('id');
  const p = C.findProduct(id);
  if (!p) {
    $('#pdp').innerHTML = `<div class="empty"><h1 class="h2">We couldn't find that product.</h1><p>It may have moved or sold out.</p><a class="btn btn-primary" href="shop.html">Browse the shop</a></div>`;
    return;
  }
  const cat = C.categories.find((c) => c.id === p.category);
  const st = { v: C.defaultVariant(p), qty: 1, img: 0 };
  document.title = `${p.name} — The Epoxy Studio`;
  document.querySelector('meta[name="description"]').setAttribute('content', p.description);

  // SEO: product structured data
  const ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: p.description,
    brand: { '@type': 'Brand', name: 'SuperFirst' },
    offers: { '@type': 'AggregateOffer', priceCurrency: 'INR', lowPrice: Math.min(...p.variants.map((v) => v.price)), highPrice: Math.max(...p.variants.map((v) => v.price)), availability: 'https://schema.org/InStock' }
  });
  document.head.appendChild(ld);

  const imgs = (p.images && p.images.length) ? p.images : [0, 1, 2, 3].map((i) => ph([p.tint, '#CFE3E6', '#E8DDCB', '#E3E8EF'][i], ['Pack shot', 'Finished piece', 'Clarity test', 'How-to infographic'][i]));
  const f = p.facts;
  const facts = f ? `<div class="chips">
      <span class="chip chip--lg">Ratio ${esc(f.ratio)} by weight</span>
      ${f.maxDepthMm ? `<span class="chip chip--lg">Up to ${f.maxDepthMm} mm per layer</span>` : ''}
      <span class="chip chip--lg">${esc(f.workingMin)} min working time</span>
      <span class="chip chip--lg">Full cure ${esc(f.cureHrs)} hrs</span>
      ${f.uv ? '<span class="chip chip--lg chip--gold">UV resistant</span>' : ''}</div>` : '';

  $('#pdp').innerHTML = `
    <nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a> / <a href="shop.html?cat=${p.category}">${esc(cat?.name || 'Shop')}</a> / ${esc(p.name)}</nav>
    <div class="pdp">
      <div class="pdp-gallery">
        <div class="pdp-main">${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ''}<img id="mainImg" src="${imgs[0]}" alt="${esc(p.name)}"></div>
        <div class="thumbs">${imgs.map((src, i) => `<button aria-label="Show image ${i + 1}" aria-pressed="${i === 0}" data-i="${i}"><img src="${src}" alt="" class="ar-1" style="object-fit:cover;width:100%"></button>`).join('')}</div>
      </div>
      <div class="pdp-info">
        <div class="stack" style="gap:8px">
          <span class="type">${esc(p.type)}</span>
          <h1 class="h2" style="font-size:clamp(32px,3.6vw,46px)">${esc(p.name)}</h1>
          ${p.rating ? `<a href="#" class="stars" style="font-size:14px"><b>★</b> ${p.rating} · ${p.reviews} reviews</a>` : ''}
        </div>
        <p class="lead" style="font-size:17px">${esc(p.description)}</p>
        ${facts}
        <div class="stack" style="gap:10px">
          <span style="font-weight:700">${({ pigments: p.variants.some((v) => /\d/.test(v.label)) ? 'Option' : 'Colour', grout: 'Colour & size' })[p.category] || 'Pack size'}: <span id="vLabel" style="font-weight:500;color:var(--text-2)"></span></span>
          <div class="sizes" id="sizes" role="group" aria-label="Choose a size">${p.variants.map((v) => `
            <button data-v="${v.id}" ${v.inStock === false ? 'disabled aria-disabled="true" style="opacity:.5;cursor:not-allowed"' : ''}><strong>${esc(v.label)}</strong><span>${v.inStock === false ? 'Sold out' : esc(v.note || '')}</span><em>${inr(v.price)}</em></button>`).join('')}</div>
        </div>
        <div class="pdp-price" id="priceRow"></div>
        <div class="row" style="gap:10px">
          <div class="qty qty--lg" role="group" aria-label="Quantity"><button id="qMinus" aria-label="Decrease quantity">−</button><span id="qVal" aria-live="polite">1</span><button id="qPlus" aria-label="Increase quantity">+</button></div>
          <button class="btn btn-primary" id="addBtn" style="flex:1 1 180px;border-radius:12px;min-height:54px">Add to cart</button>
          <button class="btn btn-dark" id="buyBtn" style="flex:1 1 140px;border-radius:12px;min-height:54px">Buy now</button>
        </div>
        <div class="info-box">
          <div>${ICON.truck}<span>Free shipping across India. Ships in 1–2 business days.</span></div>
          <div>${ICON.returns}<span>Easy 7-day returns on unopened products.</span></div>
          <div>${ICON.chat}<span>Not sure about the size? <a href="${waLink(`Hi! Which size of ${p.name} should I buy? I'm making: `)}">Ask us on WhatsApp</a></span></div>
        </div>
        <div class="info-box" id="pinBox" hidden>
          <label for="pdpPin" style="font-weight:700">Check delivery</label>
          <div class="row" style="gap:8px"><input class="input" id="pdpPin" inputmode="numeric" maxlength="6" placeholder="Enter PIN code" style="flex:1;min-width:0" autocomplete="postal-code"><button class="btn btn-outline" id="pdpPinBtn" type="button" style="min-height:48px;border-radius:10px;padding:0 18px">Check</button></div>
          <span id="pdpPinMsg" role="status" class="muted"></span>
        </div>
        <div class="info-box" id="bundleBox" hidden></div>
      </div>
    </div>`;

  const update = () => {
    $$('#sizes button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === st.v.id));
    $('#vLabel').textContent = st.v.label;
    const save = st.v.mrp > st.v.price ? Math.round((1 - st.v.price / st.v.mrp) * 100) : 0;
    const per = st.v.grams ? ` · ${inr(Math.round(st.v.price / st.v.grams * 100))}/100 g` : '';
    $('#priceRow').innerHTML = `<strong>${inr(st.v.price * st.qty)}</strong>${save ? `<span class="strike">${inr(st.v.mrp * st.qty)}</span><span class="chip">Save ${save}%</span>` : ''}<span class="muted" style="font-size:13px;flex-basis:100%">Incl. GST${per}</span>`;
    $('#qVal').textContent = st.qty;
    $('#stickyBuy').innerHTML = `<div style="font-size:14px"><strong style="display:block">${esc(st.v.label)}</strong><span class="muted">${inr(st.v.price * st.qty)}</span></div><button class="btn btn-primary" style="border-radius:12px;min-height:48px" id="stickyAdd">Add to cart</button>`;
    $('#stickyAdd').addEventListener('click', add);
    const soldOut = st.v.inStock === false;
    ['#addBtn', '#buyBtn', '#stickyAdd'].forEach((s) => { const b = $(s); if (b) b.disabled = soldOut; });
    if (soldOut) $('#addBtn').textContent = 'Sold out';
  };
  const add = () => { Cart.add(p.id, st.v.id, st.qty); toast(`Added ${st.qty} × ${p.name.replace('SuperFirst ', '')} (${st.v.label})`); };

  $$('#sizes button:not([disabled])').forEach((b) => b.addEventListener('click', () => { st.v = p.variants.find((v) => v.id === b.dataset.v); update(); }));
  $('#qMinus').addEventListener('click', () => { st.qty = Math.max(1, st.qty - 1); update(); });
  $('#qPlus').addEventListener('click', () => { st.qty = Math.min(50, st.qty + 1); update(); });
  $('#addBtn').addEventListener('click', add);
  $('#buyBtn').addEventListener('click', () => { Cart.add(p.id, st.v.id, st.qty); location.href = 'checkout.html'; });
  $$('.thumbs button').forEach((b) => b.addEventListener('click', () => {
    $('#mainImg').src = imgs[+b.dataset.i];
    $$('.thumbs button').forEach((x) => x.setAttribute('aria-pressed', x === b));
  }));
  document.body.classList.add('has-sticky');
  update();

  // delivery check — only shown when Shiprocket is connected
  fetch(`${SITE.api}/config`).then((r) => r.json()).then((cfg) => {
    if (!cfg.shiprocket) return;
    $('#pinBox').hidden = false;
    const saved = localStorage.getItem('tes-pin'); if (saved) $('#pdpPin').value = saved;
    const go = async () => {
      const pin = $('#pdpPin').value.replace(/\D/g, '');
      if (pin.length !== 6) { $('#pdpPinMsg').textContent = 'Enter a 6-digit PIN code.'; return; }
      try { localStorage.setItem('tes-pin', pin); } catch {}
      $('#pdpPinMsg').textContent = 'Checking…';
      const d = await deliveryCheck(pin, st.v.shipKg || (st.v.grams ? st.v.grams * 1.15 / 1000 : 0.5));
      $('#pdpPinMsg').textContent = d ? deliveryText(d) : "Couldn't check right now — we deliver across most of India.";
    };
    $('#pdpPinBtn').addEventListener('click', go);
    $('#pdpPin').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  }).catch(() => {});

  // bundle: from the "Frequently bought with" column in products.xlsx
  const extras = (p.bundleWith || []).map(C.findProduct).filter((x) => x && C.inStock(x)).slice(0, 3);
  if (extras.length && C.inStock(p)) {
    const box = $('#bundleBox');
    const total = st.v.price + extras.reduce((a, x) => a + C.defaultVariant(x).price, 0);
    box.hidden = false;
    box.innerHTML = `<strong style="font-size:15px">Complete your first pour</strong>
      <div class="row" style="gap:10px">${[p, ...extras].map((x) => `<img src="${productImage(x)}" alt="${esc(x.name)}" style="width:64px;height:64px;border-radius:12px;object-fit:cover">`).join('<span aria-hidden="true" style="font-weight:800;color:var(--muted)">+</span>')}
      <span style="flex:1 1 140px">This resin + ${extras.map((x) => esc(x.name)).join(' + ')}<br><strong>${inr(total)}</strong></span></div>
      <button class="btn btn-outline btn-block" id="bundleAdd">Add all ${extras.length + 1} to cart</button>`;
    $('#bundleAdd').addEventListener('click', () => { Cart.add(p.id, st.v.id, 1); extras.forEach((x) => Cart.add(x.id, C.defaultVariant(x).id, 1)); toast('Bundle added to cart'); });
  }

  // tabs
  const tabs = [];
  if (p.howTo && p.howTo.length) tabs.push(['how', 'How to use', `<div class="grid grid-4">${p.howTo.map((s, i) => `<div><div class="step-num">${i + 1}</div><p style="margin:0;color:var(--text-2)">${esc(s)}</p></div>`).join('')}</div>`]);
  else if (p.facts) tabs.push(['how', 'How to use', `<div class="grid grid-4">${[
    ['Measure by weight', `Use a digital scale. Mix ratio ${esc(p.facts.ratio)}.`],
    ['Mix slowly for [_] minutes', 'Scrape the sides and bottom. Slow strokes mean fewer bubbles.'],
    ['Colour and pour', 'Add mica or ink, then pour within [__] minutes at [__]–[__] °C.'],
    ['Cover and cure', `Demould in [__] hrs. Fully hard in ${esc(p.facts.cureHrs)} hrs.`]
  ].map(([t, s], i) => `<div><div class="step-num">${i + 1}</div><strong class="h3">${t}</strong><p class="muted">${s}</p></div>`).join('')}</div>`]);
  tabs.push(['specs', 'Specifications', `<div class="table-wrap"><table class="specs"><tbody>${Object.entries(p.specs || {}).map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table></div>`]);
  tabs.push(['box', "What's in the box", `<p class="lead">${esc(p.inBox || '')}</p>`]);
  tabs.push(['safety', 'Safety', `<p class="lead">Work in a ventilated room, wear nitrile gloves and keep away from children and pets. [Add food-contact guidance and link your safety data sheet.]</p>`]);
  $('#tabs').innerHTML = tabs.map(([k, l], i) => `<button role="tab" id="tab-${k}" aria-controls="panel-${k}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${l}</button>`).join('');
  $('#tabPanels').innerHTML = tabs.map(([k, , html], i) => `<div role="tabpanel" id="panel-${k}" aria-labelledby="tab-${k}" ${i ? 'hidden' : ''}>${html}</div>`).join('');
  const tabBtns = $$('#tabs button');
  const select = (b) => {
    tabBtns.forEach((x) => { const on = x === b; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; $('#' + x.getAttribute('aria-controls')).hidden = !on; });
    b.focus();
  };
  tabBtns.forEach((b, i) => {
    b.addEventListener('click', () => select(b));
    b.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') select(tabBtns[(i + 1) % tabBtns.length]);
      if (e.key === 'ArrowLeft') select(tabBtns[(i - 1 + tabBtns.length) % tabBtns.length]);
    });
  });
  $('#detailsSec').hidden = false;
  if (p.category === 'resin' || p.category === 'pigments') $('#madeWith').hidden = false;

  // related
  const related = C.products.filter((x) => x.id !== p.id && (x.crafts.some((c) => p.crafts.includes(c)))).slice(0, 4);
  if (related.length) { $('#related').innerHTML = related.map(productCard).join(''); wireAddButtons($('#related')); $('#relatedSec').hidden = false; }
});
