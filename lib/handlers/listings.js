import { getMarketplaceListings, isListingPubliclyVisible } from "../kv-store.js";
import { publicStoreSlug } from "../seo-html.js";
import { catalogPriceRowsForListing } from "../catalog-price-rows.js";

function endJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store, must-revalidate");
  res.end(JSON.stringify(obj));
}

function listingVerified(pub) {
  const st = String(pub.applicationStatus || "").trim().toLowerCase();
  return st === "" || st === "approved" || st === "active";
}

export default async function handler(req, res) {
  if (req.method !== "GET") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  try {
    const rows = (await getMarketplaceListings()).filter(isListingPubliclyVisible);
    const items = rows.map(({ email: _e, ...pub }) => {
      const priceRows = catalogPriceRowsForListing(pub);
      const storeProducts = Array.isArray(pub.storeProducts) ? pub.storeProducts : [];
      const productPreview = priceRows.slice(0, 40).map((row, idx) => {
        const sp = storeProducts[idx] || {};
        const thumbRaw = typeof sp.thumbUrl === "string" ? sp.thumbUrl : typeof sp.imageUrl === "string" ? sp.imageUrl : "";
        return {
          idx,
          item: String(row.item || "").slice(0, 120),
          price: String(row.price || "").slice(0, 40),
          thumbUrl:
            /^https:\/\//i.test(thumbRaw.trim()) ? thumbRaw.trim().slice(0, 800) : "",
        };
      });
      const heritageTags = Array.isArray(pub.heritageTags)
        ? pub.heritageTags.map((t) => String(t || "").trim().slice(0, 40)).filter(Boolean).slice(0, 20)
        : [];

      return {
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
        applicationStatus:
          typeof pub.applicationStatus === "string" ? pub.applicationStatus.trim().slice(0, 80) : "",
        verified: listingVerified(pub),
        pilotBadge:
          typeof pub.pilotBadge === "string"
            ? pub.pilotBadge.trim().slice(0, 120)
            : /^seed-/i.test(String(pub.id || ""))
              ? "Pilot — Onboarding"
              : "",
        heritageTags,
        whatsappPhone: typeof pub.whatsappPhone === "string" ? pub.whatsappPhone.trim().slice(0, 40) : "",
        openingHours: typeof pub.openingHours === "string" ? pub.openingHours.trim().slice(0, 4000) : "",
        productPreview,
      };
    });
    return endJson(res, 200, { ok: true, items });
  } catch (e) {
    console.error("LISTINGS_ERROR", e);
    return endJson(res, 200, { ok: true, items: [] });
  }
}
