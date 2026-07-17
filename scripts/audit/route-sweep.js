// First Load JS per route: fetch each route's HTML from a running `next start`,
// collect <script src> + modulepreload chunks, sum their gzipped sizes.
// Usage: node route-sweep.js <baseUrl> <appDir> <route1> <route2> ...
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const [base, appDir, ...routes] = process.argv.slice(2);

async function firstLoadJs(route) {
  const res = await fetch(base + route);
  const html = await res.text();
  const srcs = new Set();
  for (const m of html.matchAll(/<script[^>]+src="([^"]+\.js)[^"]*"/g)) srcs.add(m[1]);
  for (const m of html.matchAll(/<link[^>]+rel="preload"[^>]+href="([^"]+\.js)[^"]*"/g)) srcs.add(m[1]);
  let total = 0, n = 0;
  for (const src of srcs) {
    const rel = src.replace(/^\/_next\//, '').split('?')[0];
    const file = path.join(appDir, '.next', rel);
    if (!fs.existsSync(file)) continue;
    total += zlib.gzipSync(fs.readFileSync(file)).length;
    n++;
  }
  return { route, kb: +(total / 1024).toFixed(1), scripts: n, status: res.status };
}

(async () => {
  for (const r of routes) {
    const x = await firstLoadJs(r);
    console.log(`${String(x.kb).padStart(8)} KB gz  ${String(x.scripts).padStart(3)} js  [${x.status}]  ${x.route}`);
  }
})();
