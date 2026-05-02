import {
  getBookings,
  getMarketplaceListings,
  isListingPubliclyVisible,
  getPlatformFunnel,
  getSearchAnalyticsSummary,
  getPwaMetrics,
} from "../kv-store.js";
import { CITY_SLUGS, CITY_COPY, inferPrimaryCommunity } from "../seo-data.js";

const UK_CITY_NAMES = CITY_SLUGS.map((s) => CITY_COPY[s].display);

function endJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=30");
  res.end(JSON.stringify(obj));
}

/** Count visible stores per canonical UK city (listing.city or bio mention). */
function countStoresByCity(listings) {
  const m = Object.fromEntries(UK_CITY_NAMES.map((n) => [n, 0]));
  for (const listing of listings) {
    const raw = String(listing?.city || "").trim();
    const bio = String(listing?.bio || "").toLowerCase();
    const hit =
      UK_CITY_NAMES.find((name) => raw.toLowerCase() === name.toLowerCase()) ||
      UK_CITY_NAMES.find((name) => bio.includes(name.toLowerCase()));
    if (hit) m[hit] += 1;
  }
  return UK_CITY_NAMES.map((name) => ({ name, count: m[name] || 0 }));
}

function communityPillarForStats(listing) {
  if (listing?.communityPillar) return String(listing.communityPillar);
  const k = inferPrimaryCommunity(listing);
  if (!k) return null;
  const west = new Set(["nigerian", "ghanaian", "kenyan", "african", "somali", "ugandan", "zimbabwean"]);
  if (west.has(k)) return "african";
  if (k === "caribbean" || k === "jamaican") return "caribbean";
  const asia = new Set(["asian", "south-asian", "halal"]);
  if (asia.has(k)) return "south-asian";
  return k;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  try {
    const listings = await getMarketplaceListings();
    const bookings = await getBookings();
    const visible = Array.isArray(listings) ? listings.filter(isListingPubliclyVisible) : [];
    const storesListed = visible.length;
    const ordersProcessed = Array.isArray(bookings) ? bookings.length : 0;

    const cityRows = countStoresByCity(visible);
    const citiesServed = cityRows.filter((c) => (Number(c.count) || 0) > 0).length;

    const pillars = new Set();
    for (const L of visible) {
      const p = communityPillarForStats(L);
      if (p) pillars.add(p);
    }
    const communitiesRepresented = pillars.size;

    let orderFunnel = null;
    try {
      orderFunnel = await getPlatformFunnel();
    } catch {
      orderFunnel = null;
    }

    let topSearchTerms = [];
    try {
      const s = await getSearchAnalyticsSummary();
      topSearchTerms = Array.isArray(s?.topTerms) ? s.topTerms.slice(0, 15) : [];
    } catch {
      topSearchTerms = [];
    }

    let pwa = null;
    try {
      pwa = await getPwaMetrics();
    } catch {
      pwa = null;
    }

    return endJson(res, 200, {
      ok: true,
      storesListed,
      ordersProcessed,
      citiesServed,
      communitiesRepresented,
      cities: cityRows,
      trust: { storesListed, ordersProcessed },
      orderFunnel,
      topSearchTerms,
      pwa,
    });
  } catch (e) {
    console.error("PUBLIC_STATS", e);
    return endJson(res, 200, {
      ok: true,
      storesListed: 0,
      ordersProcessed: 0,
      citiesServed: 0,
      communitiesRepresented: 0,
      cities: UK_CITY_NAMES.map((name) => ({ name, count: 0 })),
      trust: { storesListed: 0, ordersProcessed: 0 },
      orderFunnel: null,
      topSearchTerms: [],
      pwa: null,
    });
  }
}
