import { getMarketplaceListings, isListingPubliclyVisible } from "../kv-store.js";
import { siteUrl } from "../site-url.js";
import {
  getComboPage,
  CITY_COPY,
  COMMUNITY_COPY,
  CATEGORY_SLUGS,
  listingMatchesCommunity,
  listingMatchesCity,
} from "../seo-data.js";
import { MANCHESTER_AREAS, listingIsManchesterCustomerBrowse } from "../manchester-scope.js";
import { esc, jsonLdScript, publicStoreSlug } from "../seo-html.js";

const OG = () => `${siteUrl()}/icons/og-cover.svg`;

/**
 * Renders /stores/[combo-slug] landing (e.g. nigerian-manchester) when slug is not a store profile.
 * Returns null if slug is not a known combination.
 */
export async function getComboPageHtml(slugParam) {
  const combo = getComboPage(slugParam);
  if (!combo) return null;

  const city = CITY_COPY[combo.citySlug];
  const comm = COMMUNITY_COPY[combo.community];
  if (!city || !comm) return null;

  const base = siteUrl();
  const pageUrl = `${base}/stores/${encodeURIComponent(combo.slug)}`;

  let listings = [];
  try {
    listings = await getMarketplaceListings();
  } catch (e) {
    console.error("COMBO_HTML", e);
  }
  listings = listings.filter(isListingPubliclyVisible);

  function inPilotCity(listing, cityCopy) {
    const d = cityCopy.display || "";
    if (/manchester/i.test(d)) return listingIsManchesterCustomerBrowse(listing);
    return listingMatchesCity(listing, d);
  }

  const matched = listings.filter((L) => listingMatchesCommunity(L, combo.community) && inPilotCity(L, city));

  const title = `${city.display} — ${comm.h1} | Clip Services`;
  const description = `Shop ${comm.keywords.slice(0, 4).join(", ")} from independents in ${city.display}. Order online on Clip Services — secure Stripe checkout.`;

  const intro2 = `${city.display} is home to a vibrant African, Caribbean and Asian independent retail scene — grocers, market traders and beauty suppliers. Clip Services surfaces live storefronts across Greater Manchester: compare what’s listed, checkout securely by card via Stripe, and choose collection or local delivery where the seller offers it.`;

  const listHtml = matched.length
    ? `<ul style="list-style:none;padding:0;margin:24px 0">
${matched
  .map((L) => {
    const sid = encodeURIComponent(publicStoreSlug(L));
    const n = esc(L.role || "Store");
    return `<li style="margin-bottom:14px;padding:14px;background:#fff;border-radius:12px;border:1px solid #E8DFD4"><a href="/stores/${sid}" style="font-weight:700;color:#8B3A3A">${n}</a><br><span style="font-size:14px;color:#5C4033">${esc((L.bio || "").slice(0, 180))}${(L.bio || "").length > 180 ? "…" : ""}</span></li>`;
  })
  .join("\n")}
</ul>`
    : `<p><em>No matching live stores yet — <a href="/stores">browse Manchester stores</a> or <a href="/store-owner">list yours</a>.</em></p>`;

  const nearbyLinks = MANCHESTER_AREAS.slice(0, 10)
    .map(
      (a) =>
        `<a href="/stores?area=${encodeURIComponent(a.slug)}">${esc(a.label)}</a>`
    )
    .join(" · ");

  const catLinks = CATEGORY_SLUGS.slice(0, 4)
    .map((s) => `<a href="/categories/${s}">${esc(s.replace(/-/g, " "))}</a>`)
    .join(" · ");

  const related = `
<p style="margin-top:28px"><strong>Explore more</strong></p>
<p>${nearbyLinks ? `${nearbyLinks} · ` : ""}<a href="/community/${combo.community}">${esc(comm.h1)}</a> · <a href="/cities/${combo.citySlug}">${esc(city.display)} hub</a></p>
<p>Categories: ${catLinks}</p>`;

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    numberOfItems: matched.length,
    itemListElement: matched.slice(0, 24).map((L, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${base}/stores/${publicStoreSlug(L)}`,
      name: L.role || "Store",
    })),
  };

  const webPage = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url: pageUrl,
    isPartOf: { "@type": "WebSite", name: "Clip Services", url: base },
  };

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description.slice(0, 320))}">
<link rel="canonical" href="${pageUrl}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description.slice(0, 300))}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:image" content="${OG()}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#8B3A3A">
${jsonLdScript(webPage)}
${jsonLdScript(itemList)}
</head>
<body style="font-family:Inter,system-ui,sans-serif;max-width:800px;margin:0 auto;padding:24px;color:#2C1810;background:#F5F0E8;line-height:1.65">
<p><a href="/">← Home</a> · <a href="/stores">Browse stores</a></p>
<h1 style="font-family:Georgia,serif;color:#8B3A3A;font-size:clamp(1.35rem,4vw,1.85rem)">${esc(comm.h1)} in ${esc(city.display)}</h1>
<p>${esc(comm.intro.slice(0, 500))}</p>
<p>${esc(intro2)}</p>
<h2 style="font-size:1.15rem;margin-top:28px">Popular ${esc(combo.community)} stores in ${esc(city.display)}</h2>
${listHtml}
<h2 style="font-size:1.1rem;margin-top:32px">More in ${esc(city.display)}</h2>
<p>Explore the wider <a href="/cities/${combo.citySlug}">${esc(city.display)} hub</a> · <a href="/community/${combo.community}">all ${esc(combo.community)} stores on Clip Services</a> · <a href="/stores">shop live storefronts</a>.</p>
${related}
<p style="margin-top:24px"><a href="/store-owner" style="font-weight:700;color:#8B3A3A">List your store</a></p>
<script src="/js/clip-cookie.js" defer></script>
</body>
</html>`;
}
