import { getMarketplaceListings, isListingPubliclyVisible } from "../kv-store.js";
import { siteUrl } from "../site-url.js";
import {
  CITY_SLUGS,
  CATEGORY_SLUGS,
  COMMUNITY_SLUGS,
  COMBO_PAGES,
  SEARCH_LANDING_PAGES,
} from "../seo-data.js";
import { slugify, publicStoreSlug } from "../seo-html.js";
import { catalogPriceRowsForListing } from "../catalog-price-rows.js";

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  const base = siteUrl();
  const now = new Date().toISOString().split("T")[0];

  const staticUrls = [
    { loc: `${base}/`, changefreq: "daily", priority: "1.0" },
    { loc: `${base}/about`, changefreq: "weekly", priority: "0.85" },
    { loc: `${base}/search`, changefreq: "daily", priority: "0.93" },
    { loc: `${base}/stores`, changefreq: "daily", priority: "0.95" },
    { loc: `${base}/store-owner`, changefreq: "weekly", priority: "0.85" },
    { loc: `${base}/impact`, changefreq: "weekly", priority: "0.7" },
  ];

  // Manchester-first: boost Manchester pages, demote other city pages to placeholders.
  for (const c of CITY_SLUGS) {
    const isMcr = c === "manchester";
    staticUrls.push({
      loc: `${base}/cities/${c}`,
      changefreq: isMcr ? "daily" : "monthly",
      priority: isMcr ? "0.98" : "0.4",
    });
  }

  for (const s of CATEGORY_SLUGS) {
    staticUrls.push({
      loc: `${base}/categories/${s}`,
      changefreq: "weekly",
      priority: "0.88",
    });
  }

  for (const s of COMMUNITY_SLUGS) {
    staticUrls.push({
      loc: `${base}/community/${s}`,
      changefreq: "weekly",
      priority: "0.87",
    });
  }

  for (const c of COMBO_PAGES) {
    const isMcr = typeof c.citySlug === "string"
      ? c.citySlug === "manchester"
      : /manchester/i.test(String(c.slug || ""));
    staticUrls.push({
      loc: `${base}/stores/${encodeURIComponent(c.slug)}`,
      changefreq: "weekly",
      priority: isMcr ? "0.95" : "0.5",
    });
  }

  for (const p of SEARCH_LANDING_PAGES) {
    const isMcr = (typeof p.city === "string" && p.city.toLowerCase() === "manchester")
      || /manchester/i.test(String(p.slug || ""));
    staticUrls.push({
      loc: `${base}/search/${encodeURIComponent(p.slug)}`,
      changefreq: "weekly",
      priority: isMcr ? "0.95" : "0.55",
    });
  }

  let listings = [];
  try {
    listings = await getMarketplaceListings();
  } catch (e) {
    console.error("SITEMAP_LISTINGS", e);
  }

  const productSlugs = new Set();
  const storeUrls = [];

  for (const row of listings) {
    if (!isListingPubliclyVisible(row)) continue;
    const id = String(row?.id || "").trim();
    if (!id) continue;
    const pubSlug = publicStoreSlug(row);
    storeUrls.push({
      loc: `${base}/stores/${encodeURIComponent(pubSlug)}`,
      changefreq: "weekly",
      priority: "0.85",
    });
    const priceList = catalogPriceRowsForListing(row);
    priceList.forEach((pr, idx) => {
      const item = String(pr?.item || "").trim();
      if (!item) return;
      const ps = slugify(item);
      productSlugs.add(ps);
      storeUrls.push({
        loc: `${base}/store/${encodeURIComponent(id)}/p/${idx}/${slugify(item)}`,
        changefreq: "weekly",
        priority: "0.75",
      });
    });
  }

  for (const ps of productSlugs) {
    storeUrls.push({
      loc: `${base}/products/${encodeURIComponent(ps)}`,
      changefreq: "weekly",
      priority: "0.76",
    });
  }

  const all = [...staticUrls, ...storeUrls];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all
  .map(
    (u) => `  <url>
    <loc>${xmlEscape(u.loc)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  res.statusCode = 200;
  res.setHeader("content-type", "application/xml; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=3600, s-maxage=3600");
  res.end(body);
}
