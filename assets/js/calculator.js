/* Resin calculator.  Epoxy ≈ 1.1 g per cm³; +10% for cup waste. */
document.addEventListener('DOMContentLoaded', () => {
  const DENSITY = 1.1, WASTE = 1.1;
  $$('.ic').forEach((s) => (s.outerHTML = ICON[s.dataset.i]));
  $$('.wa-text').forEach((a) => (a.href = waLink('Hi! Can you help me work out how much resin I need? My project is: ')));
  const q = new URLSearchParams(location.search);
  const st = { mode: 'mould', shape: 'rect' };
  if (q.get('l')) { $('#cl').value = q.get('l'); $('#cw').value = q.get('w') || q.get('l'); $('#cdep').value = q.get('d') || 3; $('#cqty').value = 1; st.mode = +q.get('d') <= 3 ? 'coating' : 'mould'; }

  // which resin suits the job (uses maxDepthMm from the catalog)
  const pick = () => {
    const depth = +$('#cdep').value || 0;
    // set by the "Calculator use" column in products.xlsx
    const p = C.findByRole(st.mode) || C.findByRole('mould') || C.findByRole('coating') || C.findByRole('casting');
    const deep = C.findByRole('casting');
    if (p && deep && p !== deep && p.facts?.maxDepthMm && depth > p.facts.maxDepthMm && deep.facts?.maxDepthMm && depth <= deep.facts.maxDepthMm * 3) return { p: deep, switched: true };
    return { p, switched: false };
  };
  // smallest single pack that covers the grams, otherwise multiples of the largest
  const pack = (p, grams) => {
    const vs = p.variants.filter((v) => v.grams && v.inStock !== false).sort((a, b) => a.grams - b.grams);
    if (!vs.length) return null;
    const fit = vs.find((v) => v.grams >= grams);
    if (fit) return { v: fit, n: 1 };
    const big = vs[vs.length - 1];
    return { v: big, n: Math.ceil(grams / big.grams) };
  };

  const calc = () => {
    const depthCm = (+$('#cdep').value || 0) / 10;
    const qty = Math.max(1, +$('#cqty').value || 1);
    const area = st.shape === 'circle' ? Math.PI * Math.pow((+$('#cdia').value || 0) / 2, 2) : (+$('#cl').value || 0) * (+$('#cw').value || 0);
    const grams = Math.ceil((area * depthCm * DENSITY * WASTE * qty) / 5) * 5;
    if (!grams) { $('#outTotal').textContent = '—'; $('#outSplit').innerHTML = ''; $('#outRec').innerHTML = '<div>Enter your size to see a result.</div>'; return; }
    $('#outTotal').textContent = grams >= 1000 ? `${(grams / 1000).toFixed(2)} kg` : `${grams} g`;

    const { p, switched } = pick();
    if (!p) { $('#outSplit').innerHTML = ''; $('#outRec').innerHTML = '<div>Ask us on WhatsApp which resin to use for this project.</div>'; return; }
    // ratio from the catalog, e.g. "2:1". Falls back to showing total only if not filled in yet.
    const m = (p?.facts?.ratio || '').match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
    $('#outSplit').innerHTML = m
      ? (() => { const a = +m[1], b = +m[2]; return `<span>Resin (Part A): <strong>${Math.round(grams * a / (a + b))} g</strong></span><span>Hardener (Part B): <strong>${Math.round(grams * b / (a + b))} g</strong></span>`; })()
      : '<span>Split it by the ratio printed on your bottle, by weight.</span>';

    const depthMm = +$('#cdep').value || 0;
    const layers = p?.facts?.maxDepthMm && depthMm > p.facts.maxDepthMm ? Math.ceil(depthMm / p.facts.maxDepthMm) : 1;
    const k = pack(p, grams);
    if (!k) { $('#outRec').innerHTML = `<strong style="font-size:15px">We recommend ${esc(p.name)}</strong><a href="product.html?id=${p.id}">View sizes</a>`; return; }
    $('#outRec').innerHTML = `
      <strong style="font-size:15px">We recommend ${esc(p.name)}</strong>
      <span>${switched ? `At ${depthMm} mm deep you need a casting resin. ` : ''}${layers > 1 ? `Pour it in ${layers} layers of up to ${p.facts.maxDepthMm} mm, letting each one gel first. ` : ''}Best pack: <strong>${k.n > 1 ? `${k.n} × ` : ''}${esc(k.v.label)}</strong> — ${inr(k.v.price * k.n)}.</span>
      <div class="row"><button type="button" class="btn btn-primary" id="recAdd" style="border-radius:12px;min-height:48px">Add to cart</button><a href="product.html?id=${p.id}">View product</a></div>`;
    $('#recAdd').addEventListener('click', () => { Cart.add(p.id, k.v.id, k.n); toast(`Added ${k.n} × ${k.v.label} to cart`); });
  };

  $$('#mode button').forEach((b) => { if (!C.findByRole(b.dataset.v)) b.hidden = true; });
  if (!C.findByRole(st.mode)) st.mode = (['mould', 'coating', 'casting'].find((r) => C.findByRole(r))) || st.mode;
  const seg = (id, key, after) => $$(`#${id} button`).forEach((b) => {
    b.setAttribute('aria-pressed', b.dataset.v === st[key]);
    b.addEventListener('click', () => { st[key] = b.dataset.v; $$(`#${id} button`).forEach((x) => x.setAttribute('aria-pressed', x === b)); after && after(); calc(); });
  });
  seg('mode', 'mode', () => {
    if (st.mode === 'coating' && +$('#cdep').value > 3) $('#cdep').value = 2;
    if (st.mode === 'casting' && +$('#cdep').value < 15) $('#cdep').value = 25;
  });
  seg('shape', 'shape', () => { const c = st.shape === 'circle'; $('#fL').hidden = c; $('#fW').hidden = c; $('#fD').hidden = !c; });
  $$('#calc input').forEach((i) => i.addEventListener('input', calc));
  calc();
});
