/**
 * Hit every category URL against the live production site and report status.
 * Usage: node scripts/test-category-urls.mjs [base]
 *   base defaults to https://clipservice.app
 */
const base = (process.argv[2] || "https://clipservice.app").replace(/\/+$/, "");

import { CATEGORY_SLUGS, CATEGORY_SLUG_ALIASES } from "../lib/seo-data.js";

const canonical = CATEGORY_SLUGS.map((s) => `/categories/${s}`);
const aliases = Object.keys(CATEGORY_SLUG_ALIASES).map((s) => `/categories/${s}`);
const homepageLinks = [
  "/categories/fresh-produce",
  "/categories/meat-fish",
  "/categories/staples-grains",
  "/categories/oils-condiments",
  "/categories/ready-meals",
  "/categories/drinks",
  "/categories/hair-beauty",
  "/categories/fashion-fabric",
  "/categories/halal-products",
];
const garbage = ["/categories/", "/categories/does-not-exist", "/categories/foo-bar"];

const all = new Set([...canonical, ...aliases, ...homepageLinks, ...garbage]);

async function check(path) {
  const url = base + path;
  try {
    const res = await fetch(url, { redirect: "manual" });
    const loc = res.headers.get("location") || "";
    let final = "-";
    if (res.status >= 300 && res.status < 400 && loc) {
      try {
        const f = await fetch(new URL(loc, url).toString(), { redirect: "follow" });
        final = `→ ${f.status} ${f.url}`;
      } catch (_e) {}
    }
    return { path, status: res.status, location: loc, final };
  } catch (e) {
    return { path, status: 0, error: String(e?.message || e) };
  }
}

const results = [];
for (const p of [...all].sort()) {
  results.push(await check(p));
}
console.log(`Base: ${base}\n`);
const pad = (s, n) => String(s).padEnd(n);
console.log(pad("PATH", 42), pad("STATUS", 8), "RESOLVES TO");
console.log("".padEnd(120, "-"));
let bad = 0;
for (const r of results) {
  const ok = r.status === 200 || r.status === 301 || r.status === 308;
  if (!ok) bad++;
  const tag = r.status === 200 ? "OK 200" : r.status === 0 ? `ERR ${r.error}` : `${r.status}`;
  console.log(pad(r.path, 42), pad(tag, 8), r.final || r.location || "");
}
console.log(`\n${bad} non-200/301/308 result(s).`);
process.exit(bad ? 1 : 0);
