/* Local preview without any installs:  node dev-server.js  → http://localhost:3000
   Serves the site and runs the /api functions, just like Vercel does.
   Put your keys in a .env file next to this one to test Odoo / Razorpay locally. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
try {
  fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n').forEach((l) => {
    const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && m[2]) process.env[m[1]] = m[2];
  });
} catch {}
// Rebuild products from data/products.xlsx on start (needs "npm install" once)
(async () => {
  try { await require('./scripts/build-products.js')(); }
  catch (e) { console.log(e.code === 'MODULE_NOT_FOUND' ? '! Run "npm install" once so products.xlsx can be read. Using the existing data/products.js for now.' : '! ' + e.message); }
})();
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.ico': 'image/x-icon' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    const name = url.pathname.slice(5).replace(/[^a-z-]/g, '');
    const file = path.join(ROOT, 'api', name + '.js');
    if (!name || !fs.existsSync(file)) { res.statusCode = 404; return res.end('{}'); }
    let raw = ''; for await (const c of req) raw += c;
    req.rawBody = raw;
    req.body = raw ? (() => { try { return JSON.parse(raw); } catch { return {}; } })() : undefined;
    try { return await require(file)(req, res); } catch (e) { console.error(e); res.statusCode = 500; return res.end('{"error":"server error"}'); }
  }
  let p = decodeURIComponent(url.pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
  if (!f.startsWith(ROOT) || /[/\\](api|tests)[/\\]|\.env/.test(f.slice(ROOT.length))) { res.statusCode = 403; return res.end(); }
  fs.readFile(f, (err, data) => {
    if (err) { res.statusCode = 404; res.setHeader('Content-Type', 'text/html'); return res.end('<h1>Not found</h1><a href="/">Home</a>'); }
    res.setHeader('Content-Type', TYPES[path.extname(f)] || 'application/octet-stream');
    res.end(data);
  });
}).listen(process.env.PORT || 3000, () => console.log(`The Epoxy Studio running at http://localhost:${process.env.PORT || 3000}`));
