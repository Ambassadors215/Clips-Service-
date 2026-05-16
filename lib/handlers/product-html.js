import { getMarketplaceListingById, isListingPubliclyVisible } from "../kv-store.js";
import { catalogPriceRowsForListing } from "../catalog-price-rows.js";
import { siteUrl } from "../site-url.js";
import { esc, jsonLdScript, slugify, publicStoreSlug } from "../seo-html.js";
import { inferPrimaryCommunity } from "../seo-data.js";

function waDigits(phone) {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = "44" + d.slice(1);
  else if (d.length >= 10 && !d.startsWith("44")) d = "44" + d;
  return d.length >= 10 ? d : "";
}

function prettyComm(k) {
  if (!k) return "African, Caribbean & Asian groceries";
  return k
    .split("-")
    .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : ""))
    .join(" ");
}

/** @param {{ photoData?: string; thumbUrl?: string; imageUrl?: string }} sp */
function productVisual(sp) {
  const pd =
    typeof sp?.photoData === "string" && sp.photoData.startsWith("data:") && sp.photoData.length <= 125000 ? sp.photoData : "";
  const u = String(sp?.thumbUrl || sp?.imageUrl || "").trim();
  const remote = /^https:\/\//i.test(u) ? u.slice(0, 900) : "";
  return pd || remote;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  const url = new URL(req.url || "/", "http://localhost");
  const storeId = String(url.searchParams.get("storeId") || "").trim();
  const idx = parseInt(url.searchParams.get("idx") || "", 10);

  if (!storeId || Number.isNaN(idx) || idx < 0) {
    res.statusCode = 400;
    res.end("Bad Request");
    return;
  }

  let listing;
  try {
    listing = await getMarketplaceListingById(storeId);
  } catch (e) {
    listing = null;
  }

  if (!listing || !isListingPubliclyVisible(listing)) {
    res.statusCode = 404;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(
      `<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Not found</title></head><body style="font-family:Inter,sans-serif;padding:24px;background:#F5F0E8;color:#2C1810"><p>We couldn’t find that product.</p><p><a href="/stores">Browse stores</a></p></body></html>`
    );
    return;
  }

  const priceList = catalogPriceRowsForListing(listing);
  const row = priceList[idx];
  if (!row || !String(row.item || "").trim()) {
    res.statusCode = 404;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(
      `<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Not found</title></head><body style="font-family:Inter,sans-serif;padding:24px;background:#F5F0E8;color:#2C1810"><p>Product not found.</p><p><a href="/stores">Browse stores</a></p></body></html>`
    );
    return;
  }

  const base = siteUrl();
  const storeSlug = publicStoreSlug(listing);
  const storePath = `/stores/${encodeURIComponent(storeSlug)}`;
  const listingIdStr = String(listing.id || "");
  const storeName = listing.role || "Store";
  const itemName = String(row.item).trim();
  const priceStr = String(row.price || "").trim();
  const priceNum = parseFloat(priceStr.replace(/[^0-9.]/g, "")) || 0;
  const slug = slugify(itemName);
  const pageUrl = `${base}/store/${encodeURIComponent(listingIdStr)}/p/${idx}/${slug}`;

  const storeProducts = Array.isArray(listing.storeProducts) ? listing.storeProducts : [];
  const sp = storeProducts[idx] || {};
  const description = String(sp.description || "").trim();
  const inStock = sp.inStock !== false;
  const storeOpen = listing.storeOpen !== false;
  const visual = productVisual(sp);
  const ogDefault = `${base}/icons/og-cover.svg`;
  const ogImage = visual && visual.startsWith("http") ? visual : visual.startsWith("data:") ? ogDefault : ogDefault;

  const pc = inferPrimaryCommunity(listing);
  const heritageLine = Array.isArray(listing.heritageTags)
    ? listing.heritageTags
        .map((x) => String(x || "").trim())
        .filter(Boolean)
        .slice(0, 8)
        .join(" · ")
    : "";

  const city = typeof listing.city === "string" ? listing.city.trim() : "";
  const wa = waDigits(listing.whatsappPhone);
  const waUrl = wa
    ? `https://wa.me/${wa}?text=${encodeURIComponent("Hi — I’m interested in \"" + itemName.slice(0, 80) + "\" on Clip Services.")}`
    : "";

  const verified =
    listing.applicationStatus === "approved" ||
    listing.applicationStatus === "active" ||
    listing.applicationStatus === undefined ||
    listing.applicationStatus === null ||
    listing.applicationStatus === "";

  const relatedIdxs = [];
  for (let i = 0; i < priceList.length && relatedIdxs.length < 4; i++) {
    if (i === idx) continue;
    const r = priceList[i];
    if (r?.item && r?.price) relatedIdxs.push(i);
  }

  const relatedHtml = relatedIdxs
    .map((ri) => {
      const rr = priceList[ri];
      const rs = slugify(String(rr.item));
      const href = `/store/${encodeURIComponent(listingIdStr)}/p/${ri}/${rs}`;
      const label = esc(String(rr.item).slice(0, 72));
      const pr = esc(String(rr.price || ""));
      return `<a class="rel-card" href="${esc(href)}"><span class="rel-name">${label}</span><span class="rel-price">${pr}</span></a>`;
    })
    .join("");

  const cultureBlurbParts = [];
  cultureBlurbParts.push(
    `${esc(storeName)} lists authentic ${esc(prettyComm(pc).toLowerCase())} staples${city ? ` in ${esc(city)}` : ""}.`
  );
  if (heritageLine) cultureBlurbParts.push(`This counter often serves: ${esc(heritageLine)}.`);
  if (description) cultureBlurbParts.push(esc(description));
  else cultureBlurbParts.push(`Ask the seller if you need a substitute — small shops move stock fast.`);

  const title = `${esc(itemName)} — ${esc(storeName)} | Clip Services`;
  const desc = `Buy ${itemName} from ${storeName} on Clip Services. ${priceStr ? `From ${priceStr}.` : ""} UK independents, secure Stripe checkout.`;

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: itemName,
    description: description || `${itemName} from ${storeName} on Clip Services`,
    brand: { "@type": "Brand", name: storeName },
    offers: {
      "@type": "Offer",
      priceCurrency: "GBP",
      price: String(priceNum || priceStr.replace(/[^0-9.]/g, "") || "0"),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: pageUrl,
      seller: { "@type": "Organization", name: storeName },
    },
    image: ogImage,
  };

  const pageJson = JSON.stringify({
    listingId: listingIdStr,
    idx,
    storeSlug,
    item: itemName,
    priceStr,
    inStock,
    storeOpen,
  }).replace(/</g, "\\u003c");

  const imgBlock = visual
    ? visual.startsWith("data:")
      ? `<img class="hero-img" src="${visual.replace(/"/g, "&quot;")}" alt="${esc(itemName)}" fetchpriority="high" width="800" height="800" />`
      : `<img class="hero-img" src="${esc(visual)}" alt="${esc(itemName)}" fetchpriority="high" width="800" height="800" loading="eager" referrerpolicy="no-referrer" />`
    : `<div class="hero-ph" aria-hidden="true"></div>`;

  const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${esc(desc.slice(0, 320))}">
<link rel="canonical" href="${pageUrl}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet">
<meta property="og:type" content="product">
<meta property="og:title" content="${esc(itemName)} — ${esc(storeName)}">
<meta property="og:description" content="${esc(desc.slice(0, 300))}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="product:price:amount" content="${esc(String(priceNum || priceStr.replace(/[^0-9.]/g, "") || "0"))}">
<meta property="product:price:currency" content="GBP">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#8B3A3A">
${jsonLdScript(productLd)}
<style>
:root{--terracotta:#8B3A3A;--gold:#D4A017;--cream:#F5F0E8;--brown:#2C1810;--forest:#2D5016;--card:#fffdf8}
*{box-sizing:border-box}
body{margin:0;font-family:Inter,system-ui,sans-serif;background:var(--cream);color:var(--brown);line-height:1.55;min-height:100vh;padding-bottom:100px}
a{color:var(--terracotta);font-weight:600}
.topnav{position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;background:rgba(253,251,248,.95);backdrop-filter:blur(8px);border-bottom:1px solid rgba(139,58,58,.15);font-size:.95rem}
.wrap{max-width:720px;margin:0 auto;padding:0 16px 24px}
.hero{margin:0 -16px 20px;aspect-ratio:1;max-height:min(92vw,520px);background:#e8dfd4;position:relative}
.hero-img{width:100%;height:100%;object-fit:cover;display:block}
.hero-ph{width:100%;height:100%;background:linear-gradient(145deg,#e8dfd4,#c4a882)}
h1{font-family:"Playfair Display",Georgia,serif;font-size:clamp(1.45rem,4.5vw,2rem);color:var(--terracotta);margin:0 0 8px;line-height:1.15}
.price-tag{font-size:1.55rem;font-weight:800;color:var(--terracotta);margin:0 0 16px}
.culture-box{background:var(--card);border:1px solid rgba(139,58,58,.18);border-radius:14px;padding:16px 18px;margin-bottom:18px;font-size:1rem}
.culture-box p{margin:0 0 10px}
.culture-box p:last-child{margin-bottom:0}
.qty-row{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin:20px 0}
.qty-row label{font-weight:700;font-size:.9rem}
.qty-ctl{display:inline-flex;align-items:center;border:2px solid var(--terracotta);border-radius:12px;overflow:hidden;background:#fff}
.qty-ctl button{width:48px;height:48px;border:none;background:var(--cream);font-size:1.25rem;cursor:pointer;color:var(--terracotta);font-weight:700}
.qty-ctl input{width:52px;height:48px;border:none;text-align:center;font-weight:800;font-size:1.1rem;color:var(--brown)}
.btn-pr{background:var(--terracotta);color:#fff;border:none;padding:14px 22px;border-radius:12px;font-weight:700;font-size:1rem;cursor:pointer;min-height:48px;font-family:inherit}
.btn-pr:disabled{opacity:.45;cursor:not-allowed}
.btn-sec{background:transparent;color:var(--terracotta);border:2px solid var(--terracotta);padding:12px 18px;border-radius:12px;font-weight:700;font-size:1rem;cursor:pointer;min-height:48px;font-family:inherit;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}
.actions{display:flex;flex-direction:column;gap:10px;margin-top:8px}
.seller-card{background:var(--card);border-radius:14px;padding:18px;border:1px solid rgba(139,58,58,.15);margin:26px 0}
.seller-card h2{font-family:"Playfair Display",Georgia,serif;font-size:1.2rem;color:var(--terracotta);margin:0 0 10px}
.badge{font-size:.78rem;display:inline-block;padding:4px 10px;border-radius:999px;background:rgba(212,160,23,.35);border:1px solid var(--gold);font-weight:700;margin-bottom:10px;margin-right:8px}
.rel-grid{display:grid;gap:10px;margin-top:12px}
.rel-card{display:flex;justify-content:space-between;gap:12px;padding:14px;background:var(--card);border:1px solid rgba(139,58,58,.14);border-radius:12px;text-decoration:none;color:inherit;font-weight:600}
.rel-card:hover{border-color:var(--gold)}
.rel-price{color:var(--terracotta);font-weight:800;flex-shrink:0}
.toast{position:fixed;bottom:92px;left:50%;transform:translateX(-50%);background:var(--forest);color:var(--cream);padding:12px 20px;border-radius:999px;font-weight:600;opacity:0;pointer-events:none;transition:opacity .25s;z-index:300;max-width:92vw;text-align:center;font-size:.95rem}
.toast.show{opacity:1}
.dock{position:fixed;left:0;right:0;bottom:0;z-index:50;background:linear-gradient(180deg,#fffdf8,var(--cream));border-top:2px solid var(--gold);padding:12px 16px calc(12px + env(safe-area-inset-bottom,0));box-shadow:0 -8px 28px rgba(44,24,16,.12)}
.dock-inner{max-width:720px;margin:0 auto;display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between}
.muted{color:#5c4033;font-size:.95rem}
</style>
</head>
<body>
<nav class="topnav">
  <span><a href="${esc(storePath)}">← ${esc(storeName)}</a></span>
  <span><a href="/">Marketplace</a></span>
</nav>
<div class="wrap">
  <div class="hero">${imgBlock}</div>
  <h1>${esc(itemName)}</h1>
  <p class="price-tag">${esc(priceStr || `£${priceNum.toFixed(2)}`)}</p>

  <div class="culture-box">
    ${cultureBlurbParts.map((p) => `<p>${p}</p>`).join("")}
  </div>

  ${!storeOpen ? `<p style="padding:14px;background:#7f1d1d;color:#fff;border-radius:12px;font-weight:600;text-align:center">This store isn’t accepting new baskets right now — you can still browse.</p>` : ""}

  <div class="qty-row">
    <label for="pqty">Quantity</label>
    <div class="qty-ctl">
      <button type="button" id="pq-dec" aria-label="Decrease">−</button>
      <input type="text" inputmode="numeric" id="pqty" value="1" readonly aria-label="Quantity" />
      <button type="button" id="pq-inc" aria-label="Increase">+</button>
    </div>
  </div>

  <div class="actions">
    <button type="button" class="btn-pr" id="p-add" ${!inStock || !storeOpen ? "disabled" : ""}>Add to basket</button>
    <a class="btn-sec" href="${esc(storePath)}#basket">Review basket &amp; pay on ${esc(storeName)}’s store</a>
    ${waUrl ? `<a class="btn-sec" href="${esc(waUrl)}" target="_blank" rel="noopener noreferrer">Message on WhatsApp</a>` : ""}
  </div>

  <section class="seller-card">
    <h2>Sold by</h2>
    ${verified ? `<span class="badge">✓ Verified seller</span>` : ""}
    <p style="margin:0 0 8px;font-size:1.05rem"><strong>${esc(storeName)}</strong>${city ? ` · ${esc(city)}` : ""}</p>
    <p class="muted" style="margin:0 0 14px">Checkout (card, Apple Pay, Google Pay) runs on Stripe when you open the basket on the full store page.</p>
    <a class="btn-pr" style="display:inline-block;text-decoration:none;text-align:center" href="${esc(storePath)}">Shop full catalogue</a>
  </section>

  ${
    relatedHtml
      ? `<section><h2 style="font-family:Playfair Display,Georgia,serif;color:var(--terracotta);font-size:1.25rem;margin:0 0 8px">More from this shop</h2><p class="muted" style="margin:0 0 12px">Customers who picked this aisle often browse these lines too.</p><div class="rel-grid">${relatedHtml}</div></section>`
      : ""
  }
</div>
<div id="toast" class="toast" role="status" aria-live="polite"></div>
<div class="dock">
  <div class="dock-inner">
    <span class="muted" id="dock-sum">Basket syncs when you tap add</span>
    <a class="btn-pr" style="text-decoration:none" href="${esc(storePath)}#basket">Open checkout</a>
  </div>
</div>

<script type="application/json" id="product-json">${pageJson}</script>
<script>
(function(){
  var el = document.getElementById("product-json");
  var P = {};
  try { P = JSON.parse(el ? el.textContent : "{}"); } catch(e) {}
  var id = String(P.listingId || "");
  var ix = typeof P.idx === "number" ? P.idx : parseInt(P.idx,10);
  if (!id || !Number.isFinite(ix)) return;

  function cartKey(){ return "clipCart:" + id; }
  function load(){ try { return JSON.parse(localStorage.getItem(cartKey()) || "{}"); } catch(e){ return {}; } }
  function save(o){ try { localStorage.setItem(cartKey(), JSON.stringify(o)); } catch(e){} }

  var qtyEl = document.getElementById("pqty");
  var q = 1;

  function setQ(n){ q = Math.max(1, Math.min(99, Math.floor(n)||1)); if(qtyEl) qtyEl.value = String(q); }

  function toast(msg){
    var t = document.getElementById("toast");
    if(!t)return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(window.__pt);
    window.__pt = setTimeout(function(){ t.classList.remove("show"); }, 2400);
  }

  function updateDock(){
    var c = load();
    var n = 0;
    for (var k in c) {
      n += (parseInt(String(c[k]||0),10)||0);
    }
    var d = document.getElementById("dock-sum");
    if(d) d.textContent = n < 1 ? "No items yet — add above" : (n + " item(s) saved for this shop");
  }

  document.getElementById("pq-dec").onclick=function(){ setQ(q-1); };
  document.getElementById("pq-inc").onclick=function(){ setQ(q+1); };

  var addBtn = document.getElementById("p-add");
  if(addBtn){ addBtn.onclick=function(){
    if(addBtn.disabled) return;
    var c = load();
    var k = String(ix);
    var cur = parseInt(String(c[k]||0),10)||0;
    c[k] = cur + q;
    save(c);
    try {
      fetch("/api/customer-api", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "put-marketplace-cart",
          listingId: id,
          cart: c,
        }),
      }).catch(function () {});
    } catch (_s) {}
    toast("Saved " + q + " to basket · pay on the storefront");
    updateDock(); setQ(1);
    try{
      fetch("/api/store-analytics",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({listingId:id,event:"add_basket",productIdx:ix})}).catch(function(){});
    }catch(_e){}
  }; }

  updateDock();
})();
</script>
<script src="/js/clip-cookie.js" defer></script>
<script>try{if(/[?&]src=wa(?:&|$)/.test(location.search))sessionStorage.setItem("clipOrderSource","wa")}catch(_){}</script>
</body>
</html>`;

  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=120, s-maxage=300");
  res.end(html);
}
