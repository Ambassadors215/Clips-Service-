/**
 * Pilot marketplace is Greater Manchester–only until expansion.
 */

const NON_PILOT_CITIES =
  /\b(london|birmingham|leeds|leicester|bradford|bristol|liverpool|sheffield|nottingham)\b/i;

const GM_HINT =
  /\b(manchester|greater manchester|\bm\d{1,2}\b|salford|trafford|bolton|bury|oldham|rochdale|stockport|tameside|wigan|altrincham|sale\b|eccles|withington|chorlton|rusholme|longsight|hulme|fallowfield|cheetham hill|cheetham|moss side|leanshulme|levenshulme|old trafford)\b/i;

/** Neighbourhoods & labels for browse-by-area (store bio/city/postcode text match). */
export const MANCHESTER_AREAS = [
  { slug: "moss-side", label: "Moss Side", terms: ["moss side", "mossside", "m14"] },
  { slug: "hulme", label: "Hulme", terms: ["hulme", "m15"] },
  { slug: "longsight", label: "Longsight", terms: ["longsight", "m12", "m13"] },
  { slug: "rusholme", label: "Rusholme", terms: ["rusholme", "curry mile", "m14"] },
  {
    slug: "cheetham-hill",
    label: "Cheetham Hill",
    terms: ["cheetham hill", "cheetham", "m8"],
  },
  { slug: "fallowfield", label: "Fallowfield", terms: ["fallowfield", "m14"] },
  { slug: "withington", label: "Withington", terms: ["withington", "m20"] },
  { slug: "chorlton", label: "Chorlton", terms: ["chorlton", "chorlton-cum-hardy", "m21"] },
  { slug: "salford", label: "Salford", terms: ["salford", "m3", "m5", "m6", "m7"] },
  { slug: "old-trafford", label: "Old Trafford", terms: ["old trafford", "m16", "trafford"] },
];

export function listingAreaBlob(listing) {
  const parts = [
    listing?.role,
    listing?.bio,
    listing?.city,
    listing?.postcode,
    ...(Array.isArray(listing?.heritageTags) ? listing.heritageTags : []),
  ];
  return parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Hide demo seed rows from public browsing. Pending / rejected never shown in browse surfaces. */
export function listingIsLiveNotDemo(listing) {
  if (!listing || !listing.id) return false;
  if (/^seed-/i.test(String(listing.id))) return false;
  const st = String(listing.applicationStatus || "").trim().toLowerCase();
  if (st === "pending" || st === "rejected") return false;
  return true;
}

/**
 * Visible stores for customer-facing catalogue: live + geographically in-scope.
 */
export function listingIsManchesterCustomerBrowse(listing) {
  if (!listingIsLiveNotDemo(listing)) return false;
  const city = String(listing.city || "").trim();
  if (city && NON_PILOT_CITIES.test(city)) return false;
  if (!city) return true;
  if (GM_HINT.test(city)) return true;
  const blob = listingAreaBlob(listing);
  return GM_HINT.test(blob);
}

export function listingMatchesManchesterAreaSlug(listing, areaSlug) {
  const slug = String(areaSlug || "").toLowerCase().trim();
  if (!slug) return true;
  const area = MANCHESTER_AREAS.find((a) => a.slug === slug);
  if (!area) return true;
  const blob = listingAreaBlob(listing);
  return area.terms.some((t) => blob.includes(String(t || "").toLowerCase()));
}

export function normalizeManchesterAreaSlug(param) {
  const s = String(param || "").toLowerCase().trim();
  if (!s) return "";
  return MANCHESTER_AREAS.some((a) => a.slug === s) ? s : "";
}
