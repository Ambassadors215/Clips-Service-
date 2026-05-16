/**
 * Hits key routes via local server (default http://127.0.0.1:3000).
 * Terminal 1: npm start
 * Terminal 2: npm run smoke
 */

const base = process.env.SMOKE_BASE || `http://127.0.0.1:${process.env.PORT || 3000}`;
const errs = [];

function assert(cond, msg) {
  if (!cond) errs.push(msg);
}

async function get(path, expectStatuses = [200]) {
  const r = await fetch(`${base}${path}`);
  assert(expectStatuses.includes(r.status), `GET ${path} expected ${expectStatuses.join("|")}, got ${r.status}`);
  return r;
}

async function postJson(path, body, expectStatuses = [200]) {
  const r = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  assert(expectStatuses.includes(r.status), `POST ${path} expected ${expectStatuses.join("|")}, got ${r.status}`);
  try {
    return await r.json();
  } catch {
    return {};
  }
}

async function main() {
  console.log("Smoke:", base);

  await get("/");
  await get("/stores");

  let ok = await postJson("/api/track-visit", { path: "/smoke", ref: "", href: `${base}/` });
  assert(ok.ok === true, "track-visit should return ok:true");

  const listings = await (await get("/api/listings")).json();
  assert(listings.ok === true && Array.isArray(listings.items) && listings.items.length >= 1, "listings need seeds");
  const row0 = listings.items[0];
  const slug = String(row0?.storeSlug || "").trim();
  const listingId = String(row0?.id || "").trim();
  assert(slug.length > 2 && listingId.length > 3, `bad listing row slug=${slug} id=${listingId}`);

  await get(`/stores/${encodeURIComponent(slug)}`);
  await get(`/store/${encodeURIComponent(listingId)}`);
  await get(`/api/store-html?slug=${encodeURIComponent(slug)}`);

  await get(`/search`);

  await get(`/cities/manchester`);
  await get(`/categories/fresh-produce`);

  let stats = await (await get("/api/public-stats")).json();
  assert(stats.ok === true && Number(stats.storesListed) >= 1, "public-stats seeded stores");
  assert(stats.traffic && Number(stats.traffic.totalPageViews) >= 1, "traffic total after track-visit");

  const searchJson = await (await get(`/api/search?q=${encodeURIComponent("plantain")}`)).json();
  assert(searchJson.ok === true && Array.isArray(searchJson.products), "search invalid");

  ok = await postJson("/api/store-analytics", { listingId, event: "view" }, [200]);
  assert(ok.ok === true, "store-analytics view");

  if (errs.length) {
    console.error("FAILED:", errs.join("\n  "));
    process.exitCode = 1;
  } else {
    console.log("OK — smoke passed");
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
