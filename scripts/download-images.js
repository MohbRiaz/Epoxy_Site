/* =====================================================================
   Copies every product photo that is linked from another website
   (e.g. your old Odoo shop) into assets/img/remote/, so the new site
   no longer depends on the old one.  Run once before you switch off
   the Odoo website:   npm run download-images
   Then commit the new assets/img/remote folder. Safe to re-run.
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ExcelJS = require('exceljs');

const XLSX = path.join(__dirname, '..', 'data', 'products.xlsx');
const DIR = path.join(__dirname, '..', 'assets', 'img', 'remote');
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' };

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX);
  const ws = wb.getWorksheet('Products');
  const cols = [];
  ws.getRow(1).eachCell((c, i) => { if (/^image \d/i.test(String(c.value))) cols.push(i); });
  const urls = new Set();
  ws.eachRow((row, r) => { if (r > 1) cols.forEach((i) => { const v = String(row.getCell(i).text || '').trim(); if (/^https?:\/\//.test(v)) urls.add(v); }); });
  fs.mkdirSync(DIR, { recursive: true });
  let ok = 0, skip = 0, fail = 0;
  for (const url of urls) {
    const base = crypto.createHash('sha1').update(url).digest('hex').slice(0, 16);
    if (fs.readdirSync(DIR).some((f) => f.startsWith(base + '.'))) { skip++; continue; }
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const type = (res.headers.get('content-type') || '').split(';')[0];
      const ext = EXT[type] || 'jpg';
      fs.writeFileSync(path.join(DIR, `${base}.${ext}`), Buffer.from(await res.arrayBuffer()));
      ok++; process.stdout.write('.');
    } catch (e) { fail++; console.log(`\n  ! ${url} — ${e.message}`); }
  }
  console.log(`\n✓ ${ok} downloaded, ${skip} already saved, ${fail} failed → assets/img/remote/`);
  console.log('Now run "npm run build" so the site uses the local copies, then commit the folder.');
})();
