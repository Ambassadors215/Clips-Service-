import { getMarketplaceListings, isListingPubliclyVisible } from "../kv-store.js";
import { publicStoreSlug } from "../seo-html.js";

function endJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store, must-revalidate");
  res.end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  if (req.method !== "GET") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  try {
    const rows = (await getMarketplaceListings()).filter(isListingPubliclyVisible);
    const items = rows.map(({ email: _e, ...pub }) => ({
      id: pub.id,
      storeSlug: publicStoreSlug(pub),
      role: pub.role,
      bio: pub.bio,
      services: pub.services,
      category: pub.category,
      icon: pub.icon,
      popular: pub.popular,
      communityPillar: typeof pub.communityPillar === "string" ? pub.communityPillar.trim() : "",
      city: typeof pub.city === "string" ? pub.city.trim() : "",
      coverImageUrl: typeof pub.coverImageUrl === "string" ? pub.coverImageUrl.trim() : "",
      negotiationEnabled: pub.negotiationEnabled !== false,
      priceList: Array.isArray(pub.priceList) ? pub.priceList.slice(0, 20) : [],
      pricingNote: typeof pub.pricingNote === "string" ? pub.pricingNote.slice(0, 2000) : "",
    }));
    return endJson(res, 200, { ok: true, items });
  } catch (e) {
    console.error("LISTINGS_ERROR", e);
    return endJson(res, 200, { ok: true, items: [] });
  }
}
