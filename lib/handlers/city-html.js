import { getMarketplaceListings, isListingPubliclyVisible } from "../kv-store.js";
import { listingIsManchesterCustomerBrowse, MANCHESTER_AREAS } from "../manchester-scope.js";
import { siteUrl } from "../site-url.js";
import {
  CITY_COPY,
  CITY_SLUGS,
  CATEGORY_SLUGS,
  CATEGORY_NAV_LABELS,
  listingMatchesCity,
  listingMatchesCommunity,
} from "../seo-data.js";
import { esc, jsonLdScript, publicStoreSlug } from "../seo-html.js";

const OG_IMAGE = () => `${siteUrl()}/icons/og-cover.svg`;

const LEGACY_MULTI_CITY_SLUGS = new Set([
  "london",
  "birmingham",
  "leeds",
  "leicester",
  "bradford",
  "bristol",
  "liverpool",
  "sheffield",
  "nottingham",
]);

/** Pilot: treat “stores in Manchester” without requiring the word Manchester in bios. */
function listingInPilotCity(listing, display) {
  if (/manchester/i.test(String(display || ""))) {
    return listingIsManchesterCustomerBrowse(listing);
  }
  return listingMatchesCity(listing, display);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  const url = new URL(req.url || "/", "http://localhost");
  const slug = String(url.searchParams.get("city") || "")
    .toLowerCase()
    .trim();

  if (!CITY_SLUGS.includes(slug) || !CITY_COPY[slug]) {
    if (LEGACY_MULTI_CITY_SLUGS.has(slug)) {
      res.statusCode = 301;
      res.setHeader("Location", `/cities/manchester`);
      res.end();
      return;
    }
    res.statusCode = 404;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(`<!DOCTYPE html><html><head><title>Not found</title></head><body><p>City page not found.</p><p><a href="/">Home</a></p></body></html>`);
    return;
  }

  const copy = CITY_COPY[slug];
  const base = siteUrl();
  const pageUrl = `${base}/cities/${slug}`;

  let listings = [];
  try {
    listings = await getMarketplaceListings();
  } catch (e) {
    console.error("CITY_HTML_LISTINGS", e);
  }
  listings = listings.filter(isListingPubliclyVisible);

  const matched = listings.filter((L) => listingInPilotCity(L, copy.display));

  const longBody = `Clip Services is live in Greater Manchester with independent African, Caribbean and Asian stores and market traders. Use this hub to discover groceries, halal meat, hair and beauty, fashion and fabric, ready meals and more — from verified local traders. Each shop sets its own collection or delivery options; you pay securely by card via Stripe.`;

  function sectionFor(communityKey, heading) {
    const inSection = matched.filter((L) => listingMatchesCommunity(L, communityKey));
    if (!inSection.length) return "";
    const items = inSection
      .slice(0, 6)
      .map((L) => {
        const sid = encodeURIComponent(publicStoreSlug(L));
        const n = esc(L.role || "Store");
        const bio = esc((L.bio || "").slice(0, 140));
        return `<li style="margin-bottom:10px;padding:12px;background:#fff;border-radius:10px;border:1px solid #E8DFD4"><a href="/stores/${sid}" style="font-weight:700;color:#8B3A3A">${n}</a>${bio ? `<br><span style="font-size:13px;color:#5C4033">${bio}</span>` : ""}</li>`;
      })
      .join("");
    return `<h2 style="font-size:1.1rem;margin-top:28px">${esc(heading)}</h2><ul style="list-style:none;padding:0;margin:12px 0">${items}</ul>`;
  }

  const nearbyLinks =
    slug === "manchester"
      ? MANCHESTER_AREAS.map(
          (a) => `<a href="/stores?area=${encodeURIComponent(a.slug)}">${esc(a.label)}</a>`
        ).join(" · ")
      : "";

  const catLinks = CATEGORY_SLUGS.map(
    (s) => `<a href="/categories/${encodeURIComponent(s)}">${esc(CATEGORY_NAV_LABELS[s] || s)}</a>`
  ).join(" · ");

  const listHtml = matched.length
    ? `<ul style="list-style:none;padding:0;margin:24px 0">
${matched
  .map((L) => {
    const sid = encodeURIComponent(publicStoreSlug(L));
    const n = esc(L.role || "Store");
    return `<li style="margin-bottom:14px;padding:14px;background:#fff;border-radius:12px;border:1px solid #E8DFD4"><a href="/stores/${sid}" style="font-weight:700;color:#8B3A3A">${n}</a><br><span style="font-size:14px;color:#5C4033">${esc((L.bio || "").slice(0, 160))}${(L.bio || "").length > 160 ? "…" : ""}</span></li>`;
  })
  .join("\n")}
</ul>`
    : `<p><em>No live stores match this hub yet — <a href="/stores">browse Manchester stores</a> or <a href="/store-owner">list yours</a>.</em></p>`;

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${base}/` },
      { "@type": "ListItem", position: 2, name: copy.display, item: pageUrl },
    ],
  };

  const webPage = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: copy.title,
    description: copy.description,
    url: pageUrl,
    isPartOf: { "@type": "WebSite", name: "Clip Services", url: base },
  };

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Stores in ${copy.display}`,
    numberOfItems: matched.length,
    itemListElement: matched.slice(0, 40).map((L, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${base}/stores/${publicStoreSlug(L)}`,
      name: L.role || "Store",
    })),
  };

  const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(copy.title)}</title>
<meta name="description" content="${esc(copy.description)}">
<link rel="canonical" href="${pageUrl}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(copy.title)}">
<meta property="og:description" content="${esc(copy.description)}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:image" content="${OG_IMAGE()}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#8B3A3A">
${jsonLdScript(breadcrumb)}
${jsonLdScript(webPage)}
${jsonLdScript(itemList)}
<link rel="stylesheet" href="/css/global-search.css">
</head>
<body style="font-family:system-ui,Segoe UI,sans-serif;color:#2C1810;background:#F5F0E8;line-height:1.65;margin:0">
<div id="global-search-mount"></div>
<div style="max-width:800px;margin:0 auto;padding:24px">
<p><a href="/">← Home</a> · <a href="/stores">Browse stores</a></p>
<h1 style="font-family:Georgia,serif;color:#8B3A3A">African, Caribbean &amp; Asian stores in ${esc(copy.display)}</h1>
<p>${esc(copy.intro)}</p>
<p>${esc(longBody)}</p>
${sectionFor("african", `Popular African stores in ${copy.display}`)}
${sectionFor("caribbean", `Caribbean food shops near you in ${copy.display}`)}
${sectionFor("asian", `Asian grocery stores in ${copy.display}`)}
<h2 style="font-size:1.15rem;margin-top:32px">All stores in ${esc(copy.display)}</h2>
${listHtml}
<p style="margin-top:24px"><strong>Browse by area (Greater Manchester)</strong></p>
<p>${nearbyLinks || `<a href="/stores">Browse stores</a>`}</p>
<p style="margin-top:16px"><strong>Shop by category</strong></p>
<p>${catLinks}</p>
<p style="margin-top:16px"><a href="/blog">Blog — shopping guides</a></p>
<h2 style="font-size:1.15rem;margin-top:36px">FAQ — ${esc(copy.display)}</h2>
<details style="margin-bottom:10px;background:#fff;padding:14px;border-radius:10px;border:1px solid #E8DFD4"><summary>Can I get delivery in ${esc(copy.display)}?</summary><p>Delivery depends on each independent store. Check the store profile or ask when you order — many offer collection or local delivery.</p></details>
<details style="margin-bottom:10px;background:#fff;padding:14px;border-radius:10px;border:1px solid #E8DFD4"><summary>How do I pay?</summary><p>Secure card checkout with Stripe on Clip Services. You may also get WhatsApp updates from the seller.</p></details>
<details style="margin-bottom:10px;background:#fff;padding:14px;border-radius:10px;border:1px solid #E8DFD4"><summary>How do I list my shop?</summary><p><a href="/store-owner">Apply free</a> — we onboard African, Caribbean and Asian independents in Greater Manchester first.</p></details>
<p style="margin-top:28px"><a href="/store-owner" style="font-weight:700;color:#8B3A3A">List your store</a></p>
</div>
<script src="/js/global-search.js" defer></script>
<script src="/js/clip-cookie.js" defer></script>
</body>
</html>`;

  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=120, s-maxage=300");
  res.end(html);
}
