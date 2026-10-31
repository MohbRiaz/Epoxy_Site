/* =====================================================================
   Reads data/products.xlsx  →  writes data/products.js
   Runs automatically on Vercel (npm run build) and when you start
   dev-server.js. Run by hand with:  npm run build
   If the spreadsheet has a problem, it stops and lists every error
   with its sheet and row, and leaves the old products.js untouched.
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const DATA = path.join(__dirname, '..', 'data');
const XLSX = path.join(DATA, 'products.xlsx');
const OUT = path.join(DATA, 'products.js');
const REMOTE_DIR = path.join(__dirname, '..', 'assets', 'img', 'remote');
const crypto = require('crypto');
// a photo linked from another site (e.g. your old Odoo shop) uses the downloaded
// copy in assets/img/remote/ once you've run "npm run download-images"
function localCopy(url) {
  if (!/^https?:\/\//.test(url) || !fs.existsSync(REMOTE_DIR)) return url;
  const base = crypto.createHash('sha1').update(url).digest('hex').slice(0, 16);
  const hit = fs.readdirSync(REMOTE_DIR).find((f) => f.startsWith(base + '.'));
  return hit ? `assets/img/remote/${hit}` : url;
}

// categories & crafts come from catalog.js so the two always match
const SETTINGS = (() => { delete require.cache[require.resolve('../data/catalog.js')]; return require('../data/catalog.js'); })();
const CAT_BY_NAME = Object.fromEntries(SETTINGS.categories.map((c) => [norm(c.name), c.id]));
const ROLES = { coating: 'coating', 'moulds & coasters': 'mould', 'deep pour': 'casting' };

function norm(s) { return String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' '); }
function slug(s) { return norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

// exceljs returns rich text, hyperlinks and formulas as objects — flatten them
function val(cell) {
  let v = cell.value;
  if (v == null) return '';
  if (typeof v === 'object') {
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (v.richText) v = v.richText.map((t) => t.text).join('');
    else if (v.text != null) v = v.text;
    else if (v.result != null) v = v.result;
    else if (v.error) v = '';
  }
  return typeof v === 'string' ? v.trim() : v;
}

function readSheet(wb, name, errors) {
  const ws = wb.getWorksheet(name);
  if (!ws) { errors.push(`The sheet "${name}" is missing. Don't rename the sheets.`); return []; }
  const headers = {};
  ws.getRow(1).eachCell((cell, col) => { headers[col] = norm(String(val(cell)).replace(/\*$/, '')); });
  const rows = [];
  ws.eachRow((row, r) => {
    if (r === 1) return;
    if (String(val(row.getCell(1))).startsWith('↳')) return;   // grey help row under the titles
    const o = { _row: r };
    let any = false;
    Object.entries(headers).forEach(([col, h]) => { const v = val(row.getCell(+col)); o[h] = v; if (v !== '') any = true; });
    if (any) rows.push(o);
  });
  return rows;
}

const yes = (v, dflt = false) => (v === '' || v == null ? dflt : ['yes', 'y', 'true', '1'].includes(norm(v)));
const num = (v) => (v === '' || v == null ? null : Number(String(v).replace(/[₹,\s]/g, '')));
const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

async function build({ quiet = false } = {}) {
  if (!fs.existsSync(XLSX)) { if (!quiet) console.log('No data/products.xlsx found — keeping existing data/products.js'); return { skipped: true }; }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX);
  const errors = [];
  const warnings = [];
  const P = readSheet(wb, 'Products', errors);
  const S = readSheet(wb, 'Sizes', errors);
  const where = (sheet, r) => `${sheet} sheet, row ${r}`;

  const products = [];
  const ids = new Set();
  for (const r of P) {
    const at = where('Products', r._row);
    const id = String(r['product id'] || '').trim();
    if (!id) { errors.push(`${at}: Product ID is empty.`); continue; }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) errors.push(`${at}: Product ID "${id}" must be lowercase letters, numbers and dashes only (try "${slug(id)}").`);
    if (ids.has(id)) { errors.push(`${at}: Product ID "${id}" is used twice — each product needs its own ID.`); continue; }
    ids.add(id);
    for (const f of ['product name', 'category', 'product type', 'short line', 'description'])
      if (!r[f]) errors.push(`${at}: "${f}" is required for ${id}.`);
    const category = CAT_BY_NAME[norm(r['category'])];
    if (r['category'] && !category) errors.push(`${at}: Category "${r['category']}" isn't one of: ${SETTINGS.categories.map((c) => c.name).join(', ')}.`);

    const crafts = SETTINGS.crafts.filter((c) => yes(r[norm(c.name)])).map((c) => c.id);
    const role = r['calculator use'] ? ROLES[norm(r['calculator use'])] : null;
    if (r['calculator use'] && !role) errors.push(`${at}: Calculator use must be Coating, Moulds & coasters or Deep pour.`);
    const maxDepth = num(r['max pour per layer (mm)']);
    if (role && !(maxDepth > 0)) warnings.push(`${at}: add "Max pour per layer (mm)" for ${id} so the calculator can advise on layers.`);
    const hasFacts = ['mix ratio', 'max pour per layer (mm)', 'working time (min)', 'full cure (hours)'].some((k) => r[k] !== '' && r[k] != null);
    const specs = {};
    for (let i = 1; i <= 6; i++) { const k = r[`spec ${i} name`], v = r[`spec ${i} value`]; if (k) specs[String(k)] = String(v ?? ''); }
    const tint = String(r['placeholder colour'] || '').trim();
    if (tint && !/^#[0-9a-f]{6}$/i.test(tint)) warnings.push(`${at}: Placeholder colour "${tint}" should look like #D7E8E8 — using default.`);
    const swatches = list(r['colour swatches']);
    swatches.filter((s) => !/^#[0-9a-f]{3,6}$/i.test(s)).forEach((s) => warnings.push(`${at}: swatch "${s}" isn't a colour code like #C9A24A — skipped.`));
    const rating = num(r['rating']);

    products.push({
      id,
      name: String(r['product name'] || ''),
      category: category || '',
      type: String(r['product type'] || ''),
      short: String(r['short line'] || ''),
      description: String(r['description'] || ''),
      crafts,
      badge: String(r['badge'] || ''),
      featured: yes(r['featured on homepage']),
      visible: yes(r['show on website'], true),
      sort: num(r['sort order']) ?? 999,
      tint: /^#[0-9a-f]{6}$/i.test(tint) ? tint : '#E3F1F1',
      images: [1, 2, 3, 4].map((i) => String(r[`image ${i}`] || '').trim()).filter(Boolean)
        .map((f) => (/^(https?:)?\/\//.test(f) || f.startsWith('/') || f.startsWith('assets/') ? localCopy(f) : `assets/img/${f}`)),
      howTo: String(r['how to use (one step per line)'] || '').split(/\r?\n/).map((s) => s.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean),
      rating: rating > 0 ? rating : null,
      hsn: String(r['hsn code'] || '').trim(),
      reviews: num(r['review count']) || 0,
      swatches: swatches.filter((s) => /^#[0-9a-f]{3,6}$/i.test(s)),
      calculatorRole: role,
      bundleWith: list(r['frequently bought with']),
      facts: hasFacts ? {
        ratio: String(r['mix ratio'] || '[_:_]'),
        maxDepthMm: maxDepth,
        workingMin: r['working time (min)'] === '' ? '[__]' : String(r['working time (min)']),
        cureHrs: r['full cure (hours)'] === '' ? '[__]' : String(r['full cure (hours)']),
        uv: yes(r['uv resistant'])
      } : null,
      specs,
      inBox: String(r["what's in the box"] || ''),
      variants: [],
      _row: r._row
    });
  }

  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  for (const r of S) {
    const at = where('Sizes', r._row);
    const pid = String(r['product id'] || '').trim();
    const p = byId[pid];
    if (!pid) { errors.push(`${at}: Product ID is empty.`); continue; }
    if (!p) { errors.push(`${at}: Product ID "${pid}" isn't on the Products sheet.`); continue; }
    const label = String(r['size label'] || '').trim();
    if (!label) { errors.push(`${at}: Size label is required.`); continue; }
    const price = num(r['price (₹)']);
    if (!(price > 0) || !Number.isFinite(price)) { errors.push(`${at}: Price for ${pid} ${label} must be a number above 0 (no ₹ sign or commas).`); continue; }
    let mrp = num(r['mrp (₹)']);
    if (mrp != null && mrp < price) { warnings.push(`${at}: MRP is lower than the price for ${pid} ${label} — MRP ignored.`); mrp = null; }
    let vid = slug(label) || 'default';
    let n = 2; while (p.variants.some((v) => v.id === vid)) vid = `${slug(label)}-${n++}`;
    const grams = num(r['weight (g)']);
    const shipKg = num(r['shipping weight (kg)']);
    const boxM = String(r['box size (cm)'] || '').match(/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)/i);
    if (r['box size (cm)'] && !boxM) warnings.push(`${at}: Box size "${r['box size (cm)']}" should look like 20 x 15 x 10 — using the default box.`);
    p.variants.push({
      id: vid, label, note: String(r['note'] || ''), price: Math.round(price * 100) / 100, mrp: Math.round((mrp || price) * 100) / 100,
      grams: grams > 0 ? grams : null, shipKg: shipKg > 0 ? shipKg : null,
      box: boxM ? { l: +boxM[1], b: +boxM[2], h: +boxM[3] } : null, isDefault: yes(r['default size']), inStock: yes(r['in stock'], true), sku: String(r['sku'] || '')
    });
  }

  for (const p of products) {
    if (!p.variants.length) errors.push(`Products sheet, row ${p._row}: ${p.id} has no sizes. Add at least one row for it on the Sizes sheet.`);
    if (p.calculatorRole && !p.variants.some((v) => v.grams)) warnings.push(`${p.id}: add "Weight (g)" on its sizes so the resin calculator can suggest a pack.`);
    p.bundleWith = p.bundleWith.filter((b) => { if (!byId[b]) { warnings.push(`${p.id}: "Frequently bought with" ID "${b}" doesn't exist — skipped.`); return false; } return b !== p.id; });
    delete p._row;
  }
  const visible = products.filter((p) => p.visible);
  for (const role of ['coating', 'mould', 'casting']) {
    const n = visible.filter((p) => p.calculatorRole === role).length;
    if (n === 0) warnings.push(`No visible product has Calculator use = ${Object.keys(ROLES).find((k) => ROLES[k] === role)}; the calculator will skip that option.`);
    if (n > 1) warnings.push(`More than one product has Calculator use = ${Object.keys(ROLES).find((k) => ROLES[k] === role)}; the first one is used.`);
  }
  if (!visible.length) errors.push('No products are set to "Show on website = Yes".');

  if (errors.length) {
    console.error(`\n✗ products.xlsx has ${errors.length} problem${errors.length > 1 ? 's' : ''} — the website was NOT updated:\n`);
    errors.forEach((e) => console.error('  • ' + e));
    console.error('');
    return { errors, warnings };
  }

  const banner = `/* AUTO-GENERATED from data/products.xlsx on ${new Date().toISOString()}.\n   Do not edit by hand — edit the Excel file and run "npm run build". */\n`;
  const js = `${banner}(function (root) {\n  const PRODUCTS = ${JSON.stringify(products, null, 2).replace(/\n/g, '\n  ')};\n  if (typeof module !== 'undefined' && module.exports) module.exports = PRODUCTS;\n  else root.TES_PRODUCTS = PRODUCTS;\n})(typeof window !== 'undefined' ? window : globalThis);\n`;
  fs.writeFileSync(OUT, js);
  if (!quiet || warnings.length) {
    console.log(`✓ Products updated: ${visible.length} on the website (${products.length - visible.length} hidden), ${products.reduce((a, p) => a + p.variants.length, 0)} sizes.`);
    warnings.forEach((w) => console.log('  ! ' + w));
  }
  return { errors: [], warnings, count: products.length };
}

module.exports = build;
if (require.main === module) build().then((r) => { if (r.errors && r.errors.length) process.exit(1); }).catch((e) => { console.error('✗ Could not read products.xlsx:', e.message); process.exit(1); });
