/* Homepage */
document.addEventListener('DOMContentLoaded', () => {
  $$('.checks .ic').forEach((s) => (s.outerHTML = ICON.check));
  $$('.ic-chat').forEach((s) => (s.outerHTML = ICON.chat));
  $('#askExpert').href = waLink("Hi! I'm not sure which resin to buy. I'm making: ");
  $$('.wa-text').forEach((a) => (a.href = waLink('Hi! I have a question about resin.')));
  $('#igLink').href = SITE.instagram;

  $('#trust').innerHTML = [
    [ICON.truck, 'Free shipping', 'On every order, pan-India'],
    [ICON.returns, '7-day returns', 'Quick refund or exchange'],
    [ICON.lock, 'Secure checkout', 'UPI, cards, net banking, COD'],
    [ICON.shield, 'Batch-tested', 'Every lot poured in our studio']
  ].map(([i, t, s]) => `<div>${i}<div><strong>${t}</strong><span>${s}</span></div></div>`).join('');

  $('#crafts').innerHTML = C.crafts.filter((c) => C.products.some((p) => p.crafts.includes(c.id))).map((c) => `
    <a class="card" href="shop.html?craft=${c.id}">
      <img class="media ar-1" src="${ph(c.tint, c.name, 400, 400)}" alt="" loading="lazy">
      <div class="card-body"><strong class="h3">${esc(c.name)}</strong><span class="sub">${esc(c.uses)}</span></div>
    </a>`).join('');

  const renderBest = (cat) => {
    const list = C.products.filter((p) => (cat ? p.category === cat : p.featured)).sort((a, b) => C.inStock(b) - C.inStock(a)).slice(0, 4);
    $('#bestsellers').innerHTML = list.map(productCard).join('');
    wireAddButtons($('#bestsellers'));
  };
  $$('#bestTabs button').forEach((b) => b.addEventListener('click', () => {
    $$('#bestTabs button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    renderBest(b.dataset.cat);
  }));
  renderBest('');

  // Starter kit banner — uses the product with ID "first-pour-kit" (hidden if it doesn't exist or is sold out)
  const kit = C.findProduct('first-pour-kit');
  if (kit && C.inStock(kit)) {
    const v = C.defaultVariant(kit);
    $('#kitPrice').innerHTML = `${inr(v.price)}<small>${v.mrp > v.price ? `Save ${inr(v.mrp - v.price)}` : ''}</small>`;
    $('#kitAdd').addEventListener('click', () => { Cart.add(kit.id, v.id, 1); toast('Kit added to cart'); });
  } else $('#kitSec').hidden = true;
  const heroP = C.findByRole('mould') || C.products.find((p) => p.category === 'resin');
  if (heroP) $('#heroPrice').textContent = `From ${inr(Math.min(...heroP.variants.map((v) => v.price)))} · free shipping`;

  // one card per pigment product (up to 3); swatches come from the "Colour swatches" column
  const pig = C.products.filter((p) => p.category === 'pigments').slice(0, 3);
  if (!pig.length) $('#pigments').closest('section').hidden = true;
  $('#pigments').innerHTML = pig.map((p) => `
    <a class="card pigment" href="product.html?id=${p.id}">
      <div class="swatches">${(p.swatches || []).map((s) => `<i style="background:${s}"></i>`).join('')}</div>
      <strong class="h3" style="font-size:20px">${esc(p.name)}</strong>
      <p>${esc(p.short)}</p>
      <span style="font-weight:700;color:var(--teal)">${p.variants.length > 1 ? `${p.variants.length} options, from ` : ''}${inr(Math.min(...p.variants.map((v) => v.price)))}</span>
    </a>`).join('');

  const lessons = [
    ['Start here', 'Your first resin coaster in 20 minutes', 'Mixing, pouring and demoulding — the basics done right.'],
    ['Fix a failed pour', 'Sticky, bendy or cloudy? Six causes and fixes', 'Work out what went wrong before your next pour.'],
    ['Technique', 'Ocean waves with white pigment and a heat gun', 'Cells, lacing and foam, step by step.']
  ];
  $('#lessons').innerHTML = lessons.map(([tag, t, s]) => `
    <a class="lesson" href="${SITE.youtube}">
      <div class="media-wrap"><img class="media ar-169" src="${ph('#24313A', 'Video thumbnail', 640, 360)}" alt="" loading="lazy"><span class="play">${ICON.play}</span></div>
      <small>${tag}</small><strong class="h3" style="font-size:19px">${t}</strong><span>${s}</span>
    </a>`).join('');

  // quick calculator estimate (full version on calculator.html)
  const est = () => {
    const l = +$('#ql').value, w = +$('#qw').value, d = +$('#qd').value / 10;
    const g = l * w * d * 1.1 * 1.1;
    $('#quickGrams').textContent = g > 0 ? `${Math.ceil(g / 10) * 10} g of mixed resin` : '—';
  };
  ['#ql', '#qw', '#qd'].forEach((s) => $(s).addEventListener('input', est));
  est();
});
