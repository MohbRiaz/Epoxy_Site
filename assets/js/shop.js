/* Shop / category page.  URL: shop.html?cat=resin&craft=coasters */
document.addEventListener('DOMContentLoaded', () => {
  const q = new URLSearchParams(location.search);
  const state = { cat: q.get('cat') || '', type: q.get('type') || '', crafts: new Set((q.get('craft') || '').split(',').filter(Boolean)), price: '', sort: 'featured' };
  const intros = {
    '': 'Everything you need to pour — resin, colour, moulds and tools, all tested in our studio.',
    resin: 'Crystal-clear SuperFirst epoxy for coasters, canvas, geodes and river tables. Every batch is poured and checked in our studio before it ships.',
    pigments: 'Mica powders, alcohol inks and opaque pigments that disperse evenly and never muddy your resin.',
    kits: 'Everything for your first project in one box — no guesswork, no missing tools.',
    tools: 'Glossy silicone moulds and the reusable basics every resin artist needs.',
    industrial: 'SuperFirst epoxy for floors, roofs and waterproofing — seamless, glossy and long-lasting. Need a large quantity? Ask us for a project quote.',
    grout: 'Strong, waterproof, stain-proof epoxy grout for bathrooms, kitchens and floors, in six colours.'
  };
  $('#filterWa').href = waLink('Hi! Can you help me choose products? I am making: ');

  $('#catPills').innerHTML = [{ id: '', name: 'All' }, ...C.categories.filter((c) => C.hasProducts(c.id))].map((c) =>
    `<button data-cat="${c.id}" aria-pressed="${c.id === state.cat}">${esc(c.name)}</button>`).join('');
  $('#craftFilter').insertAdjacentHTML('beforeend', C.crafts.map((c) =>
    `<label><input type="checkbox" value="${c.id}" ${state.crafts.has(c.id) ? 'checked' : ''}> ${esc(c.name)}</label>`).join(''));

  const syncUrl = () => {
    const p = new URLSearchParams();
    if (state.cat) p.set('cat', state.cat);
    if (state.type) p.set('type', state.type);
    if (state.crafts.size) p.set('craft', [...state.crafts].join(','));
    history.replaceState(null, '', 'shop.html' + (p.toString() ? '?' + p : ''));
  };

  const render = () => {
    const catName = state.cat ? C.categories.find((c) => c.id === state.cat)?.name : 'Shop all';
    $('#shopTitle').textContent = catName;
    $('#crumbCur').textContent = catName;
    $('#shopIntro').textContent = intros[state.cat] ?? intros[''];
    document.title = `${catName} — The Epoxy Studio`;
    $$('#catPills button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.cat === state.cat));
    $$('.main-nav a').forEach((a) => {
      const m = a.getAttribute('href').match(/cat=(\w+)/);
      if (m) m[1] === state.cat ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
    });

    let list = C.products.filter((p) => !state.cat || p.category === state.cat);
    if (state.type) list = list.filter((p) => p.type === state.type);
    if (state.crafts.size) list = list.filter((p) => p.crafts.some((c) => state.crafts.has(c)));
    const price = (p) => Math.min(...p.variants.map((v) => v.price));
    if (state.price) { const [lo, hi] = state.price.split('-').map(Number); list = list.filter((p) => price(p) >= lo && price(p) < hi); }
    if (state.sort === 'low') list.sort((a, b) => price(a) - price(b));
    if (state.sort === 'high') list.sort((a, b) => price(b) - price(a));
    if (state.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    if (state.sort === 'featured') list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

    $('#resultCount').textContent = `${list.length} product${list.length === 1 ? '' : 's'}`;
    $('#grid').innerHTML = list.length ? list.map(productCard).join('')
      : `<div class="empty" style="grid-column:1/-1"><p>Nothing matches those filters.</p><button class="btn btn-outline" id="clearF">Clear filters</button></div>`;
    wireAddButtons($('#grid'));
    $('#clearF')?.addEventListener('click', () => {
      state.crafts.clear(); state.price = ''; state.cat = ''; state.type = '';
      $$('#craftFilter input').forEach((i) => (i.checked = false));
      $('#priceFilter input[value=""]').checked = true;
      syncUrl(); render();
    });
  };

  $$('#catPills button').forEach((b) => b.addEventListener('click', () => { state.cat = b.dataset.cat; state.type = ''; syncUrl(); render(); }));
  $$('#craftFilter input').forEach((i) => i.addEventListener('change', () => { i.checked ? state.crafts.add(i.value) : state.crafts.delete(i.value); syncUrl(); render(); }));
  $$('#priceFilter input').forEach((i) => i.addEventListener('change', () => { state.price = i.value; render(); }));
  $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
  render();
});
