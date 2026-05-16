import crypto from "node:crypto";
import Redis from "ioredis";
import { publicStoreSlug } from "./seo-html.js";
import { catalogPriceRowsForListing } from "./catalog-price-rows.js";
import { getMarketplaceBuiltinSeeds } from "./marketplace-seed-listings.js";

/** Must match Vercel env `KV_PREFIX` (see .env.example). Legacy: set KV_PREFIX=dhc if your data was stored under the old default. */
const PREFIX = process.env.KV_PREFIX || "cs";
const KEY_BOOKINGS = `${PREFIX}:bookings`;
const KEY_CONTACTS = `${PREFIX}:contacts`;
const KEY_PUSH_CUSTOMER = `${PREFIX}:push:customer`;
const KEY_PUSH_ADMIN = `${PREFIX}:push:admin`;
const MAX_PUSH_PER_EMAIL = 8;

function normPushEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase()
    .slice(0, 120);
}

function pushUserRedisKey(email) {
  return `${PREFIX}:push:user:${normPushEmail(email)}`;
}

function pushProviderRedisKey(email) {
  return `${PREFIX}:push:provider:${normPushEmail(email)}`;
}
const KEY_PROVIDERS = `${PREFIX}:providers`;
const KEY_NEGOTIATIONS = `${PREFIX}:negotiations`;
const KEY_MARKETPLACE_LISTINGS = `${PREFIX}:marketplace_listings`;
const KEY_ONBOARDING_APPLICATIONS = `${PREFIX}:onboarding_applications`;
const KEY_ONBOARDING_ANALYTICS = `${PREFIX}:onboarding_analytics`;
const KEY_SITE_VISITS = `${PREFIX}:site_visits`;
/** Monotonic lifetime page-load count (incremented server-side each track-visit). */
const KEY_SITE_VISITS_TOTAL = `${PREFIX}:site_visits_total`;
const MAX_SITE_VISITS = 8000;
const MAX_PUSH_SUBS = 40;

/** When unset, browsing APIs use in-memory data so `node server.js` works without Redis. */
export function isKvRedisConfigured() {
  return Boolean(String(process.env.KV_REDIS_URL || "").trim());
}

/** In-process site visit ring buffer (no Redis). */
const devSiteVisits = [];
let devSiteVisitTotal = 0;
let devSiteVisitCounterSynced = false;

function devEnsureVisitCounterSynced() {
  if (devSiteVisitCounterSynced) return;
  devSiteVisitTotal = devSiteVisits.length;
  devSiteVisitCounterSynced = true;
}

function aggregateVisitTrafficFromList(list, totalPageViews) {
  const now = Date.now();
  const ms7 = 7 * 86400000;
  const ms30 = 30 * 86400000;
  const uniq7 = new Set();
  const uniq30 = new Set();
  let pageViewsLast7d = 0;
  let pageViewsLast30d = 0;
  const rows = Array.isArray(list) ? list : [];

  for (const row of rows) {
    const t = Date.parse(String(row?.ts || ""));
    const vis = row?.visitor ? String(row.visitor) : "";
    if (!Number.isFinite(t)) continue;

    const in30 = now - t <= ms30;
    const in7 = now - t <= ms7;
    if (in30) {
      pageViewsLast30d += 1;
      if (vis) uniq30.add(vis);
      if (in7) {
        pageViewsLast7d += 1;
        if (vis) uniq7.add(vis);
      }
    }
  }

  return {
    totalPageViews: Math.max(0, Number(totalPageViews) || 0),
    uniqueVisitors7d: uniq7.size,
    uniqueVisitors30d: uniq30.size,
    pageViewsLast7d,
    pageViewsLast30d,
    sampleHits: rows.length,
  };
}

function getClient() {
  const url = process.env.KV_REDIS_URL;
  if (!url) throw new Error("KV_REDIS_URL not configured");
  return new Redis(url, {
    maxRetriesPerRequest: 2,
    lazyConnect: true,
    connectTimeout: 15_000,
    commandTimeout: 12_000,
  });
}

async function withRedis(fn) {
  const client = getClient();
  try {
    await client.connect();
    return await fn(client);
  } finally {
    client.disconnect();
  }
}

export async function getBookings() {
  if (!isKvRedisConfigured()) return [];
  return withRedis(async (client) => {
    const raw = await client.get(KEY_BOOKINGS);
    const arr = raw ? JSON.parse(raw) : [];
    return arr.sort((a, b) => String(b?.createdAt || "").localeCompare(String(a?.createdAt || "")));
  });
}

export async function addBooking(record) {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_BOOKINGS);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(record);
    await client.set(KEY_BOOKINGS, JSON.stringify(list));
  });
}

export async function updateBookingStatus(ref, status) {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_BOOKINGS);
    const list = raw ? JSON.parse(raw) : [];
    const i = list.findIndex((b) => String(b?.ref) === ref);
    if (i < 0) return false;
    list[i] = { ...list[i], status };
    await client.set(KEY_BOOKINGS, JSON.stringify(list));
    return true;
  });
}

export async function patchBooking(ref, patch) {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_BOOKINGS);
    const list = raw ? JSON.parse(raw) : [];
    const i = list.findIndex((b) => String(b?.ref) === ref);
    if (i < 0) return false;
    list[i] = { ...list[i], ...patch };
    await client.set(KEY_BOOKINGS, JSON.stringify(list));
    return true;
  });
}

export async function getContacts() {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_CONTACTS);
    const arr = raw ? JSON.parse(raw) : [];
    return arr.sort((a, b) => String(b?.createdAt || "").localeCompare(String(a?.createdAt || "")));
  });
}

export async function addContact(record) {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_CONTACTS);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(record);
    await client.set(KEY_CONTACTS, JSON.stringify(list));
  });
}

export async function getBookingByRef(ref) {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_BOOKINGS);
    const list = raw ? JSON.parse(raw) : [];
    return list.find((b) => String(b?.ref) === String(ref)) || null;
  });
}

function pushKey(role) {
  return role === "admin" ? KEY_PUSH_ADMIN : KEY_PUSH_CUSTOMER;
}

export async function getPushSubscriptions(role) {
  return withRedis(async (client) => {
    const raw = await client.get(pushKey(role));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  });
}

export async function addPushSubscription(role, subscription) {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw new Error("Invalid subscription");
  }
  return withRedis(async (client) => {
    const key = pushKey(role);
    const raw = await client.get(key);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];
    list = list.filter((s) => s?.endpoint !== subscription.endpoint);
    list.unshift(subscription);
    if (list.length > MAX_PUSH_SUBS) list = list.slice(0, MAX_PUSH_SUBS);
    await client.set(key, JSON.stringify(list));
  });
}

export async function removePushSubscription(role, endpoint) {
  return withRedis(async (client) => {
    const key = pushKey(role);
    const raw = await client.get(key);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return;
    list = list.filter((s) => s?.endpoint !== endpoint);
    await client.set(key, JSON.stringify(list));
  });
}

/** @param {'user'|'provider'} kind */
export async function getPushSubscriptionsForEmail(email, kind) {
  const e = normPushEmail(email);
  if (!e) return [];
  const redisKey = kind === "provider" ? pushProviderRedisKey(e) : pushUserRedisKey(e);
  return withRedis(async (client) => {
    const raw = await client.get(redisKey);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  });
}

/** @param {'user'|'provider'} kind */
export async function addPushSubscriptionForEmail(email, kind, subscription) {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw new Error("Invalid subscription");
  }
  const e = normPushEmail(email);
  if (!e) throw new Error("Email required");
  const redisKey = kind === "provider" ? pushProviderRedisKey(e) : pushUserRedisKey(e);
  return withRedis(async (client) => {
    const raw = await client.get(redisKey);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];
    list = list.filter((s) => s?.endpoint !== subscription.endpoint);
    list.unshift(subscription);
    if (list.length > MAX_PUSH_PER_EMAIL) list = list.slice(0, MAX_PUSH_PER_EMAIL);
    await client.set(redisKey, JSON.stringify(list));
  });
}

/** @param {'user'|'provider'} kind */
export async function removePushSubscriptionForEmail(email, kind, endpoint) {
  const e = normPushEmail(email);
  if (!e) return;
  const redisKey = kind === "provider" ? pushProviderRedisKey(e) : pushUserRedisKey(e);
  return withRedis(async (client) => {
    const raw = await client.get(redisKey);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return;
    list = list.filter((s) => s?.endpoint !== endpoint);
    await client.set(redisKey, JSON.stringify(list));
  });
}

export async function getProviders() {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_PROVIDERS);
    return raw ? JSON.parse(raw) : {};
  });
}

export async function getProvider(id) {
  const providers = await getProviders();
  return providers[String(id)] || null;
}

export async function upsertProvider(id, data) {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_PROVIDERS);
    const providers = raw ? JSON.parse(raw) : {};
    providers[String(id)] = { ...(providers[String(id)] || {}), ...data, updatedAt: new Date().toISOString() };
    await client.set(KEY_PROVIDERS, JSON.stringify(providers));
    return providers[String(id)];
  });
}

/* ── Marketplace listings (customer-facing service cards; email kept server-side only) ── */

/** Append built-in demo storefronts when KV has no row with the same listing id. */
function mergeListingSeeds(stored) {
  const ids = new Set(stored.map((x) => String(x?.id || "")));
  const out = [...stored];
  for (const row of getMarketplaceBuiltinSeeds()) {
    const id = String(row?.id || "");
    if (!id || ids.has(id)) continue;
    out.push(row);
    ids.add(id);
  }
  return out;
}

export async function getMarketplaceListings() {
  if (!isKvRedisConfigured()) return mergeListingSeeds([]);
  return withRedis(async (client) => {
    const raw = await client.get(KEY_MARKETPLACE_LISTINGS);
    const arr = raw ? JSON.parse(raw) : [];
    const stored = Array.isArray(arr) ? arr : [];
    return mergeListingSeeds(stored);
  });
}

export async function getMarketplaceListingById(id) {
  const list = await getMarketplaceListings();
  return list.find((x) => String(x?.id) === String(id)) || null;
}

/** Resolve /stores/[slug] — uses same slug algorithm as sitemap and store pages. */
export async function getMarketplaceListingByPublicSlug(slug) {
  const want = String(slug || "")
    .toLowerCase()
    .trim();
  if (!want) return null;
  const list = await getMarketplaceListings();
  return list.find((x) => publicStoreSlug(x) === want) || null;
}

export async function upsertMarketplaceListing(record) {
  const id = String(record?.id || "").trim();
  if (!id) throw new Error("Listing id required");
  return withRedis(async (client) => {
    const raw = await client.get(KEY_MARKETPLACE_LISTINGS);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];
    const i = list.findIndex((x) => String(x?.id) === id);
    const prev = i >= 0 ? list[i] : {};
    let priceListIn = Array.isArray(record.priceList) ? record.priceList : prev.priceList;
    if (Array.isArray(record.storeProducts) && record.storeProducts.length > 0) {
      priceListIn = catalogPriceRowsForListing({
        storeProducts: record.storeProducts,
        priceList: [],
      }).map(({ item, price, priceNum, compareAtNum }) => {
        const row = {
          item,
          price,
        };
        if (typeof priceNum === "number" && Number.isFinite(priceNum)) row.priceNum = priceNum;
        if (typeof compareAtNum === "number" && Number.isFinite(compareAtNum))
          row.compareAtNum = compareAtNum;
        return row;
      });
    }
    const priceList = Array.isArray(priceListIn)
      ? priceListIn
          .slice(0, 40)
          .map((row) => ({
            item: String(row?.item || "").trim().slice(0, 120),
            price: String(row?.price || "").trim().slice(0, 40),
          }))
          .filter((x) => x.item && x.price)
      : [];
    const negotiationEnabled =
      record.negotiationEnabled === undefined || record.negotiationEnabled === null
        ? prev.negotiationEnabled !== false
        : Boolean(record.negotiationEnabled);
    const row = {
      id,
      email: String(record.email !== undefined ? record.email : prev.email || "").trim().toLowerCase(),
      role: String(record.role !== undefined ? record.role : prev.role || "").slice(0, 200),
      bio: String(record.bio !== undefined ? record.bio : prev.bio || "").slice(0, 4000),
      services: Array.isArray(record.services)
        ? record.services.map((s) => String(s).slice(0, 120)).filter(Boolean).slice(0, 40)
        : Array.isArray(prev.services)
          ? prev.services
          : [],
      category: String(record.category !== undefined ? record.category : prev.category || "runner").slice(0, 40),
      icon: String(record.icon !== undefined ? record.icon : prev.icon || "plus").slice(0, 40),
      popular: record.popular !== undefined ? Boolean(record.popular) : Boolean(prev.popular),
      negotiationEnabled,
      priceList,
      updatedAt: new Date().toISOString(),
    };
    const opt = [
      "applicationStatus",
      "applicationRef",
      "onboardingFlow",
      "city",
      "postcode",
      "storeType",
      "fulfilment",
      "ownerName",
      "whatsappPhone",
      "coverImageUrl",
      "communityPillar",
      "pilotBadge",
    ];
    for (const k of opt) {
      if (record[k] !== undefined && record[k] !== null && record[k] !== "") {
        if (k === "coverImageUrl") {
          row[k] = String(record[k]).trim().slice(0, 800);
        } else {
          row[k] = typeof record[k] === "string" ? record[k].trim().slice(0, 500) : record[k];
        }
      }
    }
    if (Array.isArray(record.heritageTags)) {
      row.heritageTags = record.heritageTags
        .map((t) => String(t || "").trim().slice(0, 40))
        .filter(Boolean)
        .slice(0, 20);
    }
    if (record.openingHours !== undefined && record.openingHours !== null && record.openingHours !== "") {
      row.openingHours =
        typeof record.openingHours === "string"
          ? record.openingHours.trim().slice(0, 4000)
          : JSON.stringify(record.openingHours).slice(0, 4000);
    }
    const storeOpt = [
      "storeOpen",
      "deliveryEnabled",
      "collectionEnabled",
      "deliveryRadiusMiles",
      "deliveryChargeGbp",
      "minimumOrderGbp",
      "promotionOptIns",
      "notificationPrefs",
      "storePhotoData",
    ];
    for (const k of storeOpt) {
      if (record[k] !== undefined) {
        if (k === "promotionOptIns" || k === "notificationPrefs") {
          row[k] = record[k] && typeof record[k] === "object" ? record[k] : prev[k] || {};
        } else if (k === "storePhotoData" && typeof record[k] === "string") {
          row[k] = record[k].slice(0, 900000);
        } else if (k === "storeOpen" || k === "deliveryEnabled" || k === "collectionEnabled") {
          row[k] = Boolean(record[k]);
        } else if (k === "deliveryRadiusMiles" || k === "deliveryChargeGbp" || k === "minimumOrderGbp") {
          const n = Number(record[k]);
          row[k] = Number.isFinite(n) ? n : prev[k] ?? 0;
        }
      }
    }
    if (Array.isArray(record.storeProducts)) {
      row.storeProducts = record.storeProducts
        .slice(0, 40)
        .map((p, idx) => {
          const id = String(p?.id || `p-${idx}`).slice(0, 40);
          const name = String(p?.name || "").trim().slice(0, 120);
          const price = Number(p?.price);
          return {
            id,
            name,
            price: Number.isFinite(price) ? Math.round(price * 100) / 100 : 0,
            category: String(p?.category || "groceries").slice(0, 60),
            description: String(p?.description || "").slice(0, 500),
            inStock: p?.inStock !== false,
            featured: Boolean(p?.featured),
            lowStock: p?.lowStock === true,
            thumbUrl:
              typeof p?.thumbUrl === "string"
                ? p.thumbUrl.trim().slice(0, 800)
                : typeof p?.imageUrl === "string"
                  ? p.imageUrl.trim().slice(0, 800)
                  : "",
            photoData:
              typeof p?.photoData === "string" && p.photoData.length < 480000
                ? p.photoData
                : p?.photoData
                  ? ""
                  : "",
          };
        })
        .filter((x) => x.name);
    }
    if (Array.isArray(record.reviews)) {
      row.reviews = record.reviews
        .slice(0, 80)
        .map((r) => ({
          id: String(r?.id || "").slice(0, 40) || crypto.randomBytes(8).toString("hex"),
          rating: Math.min(5, Math.max(1, Number(r?.rating) || 5)),
          text: String(r?.text || "").slice(0, 2000),
          date: String(r?.date || new Date().toISOString()).slice(0, 40),
          productName: String(r?.productName || "").slice(0, 120),
          customerFirstName: String(r?.customerFirstName || "Customer").slice(0, 80),
          reply: String(r?.reply || "").slice(0, 2000),
          replyAt: r?.replyAt ? String(r.replyAt).slice(0, 40) : "",
        }));
    }
    if (!row.email || !row.role) throw new Error("Email and display name required");
    if (i >= 0) list[i] = { ...list[i], ...row };
    else list.unshift({ ...row, publishedAt: new Date().toISOString() });
    await client.set(KEY_MARKETPLACE_LISTINGS, JSON.stringify(list));
    return row;
  });
}

export async function removeMarketplaceListing(id) {
  const sid = String(id || "").trim();
  if (!sid) return false;
  return withRedis(async (client) => {
    const raw = await client.get(KEY_MARKETPLACE_LISTINGS);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];
    const next = list.filter((x) => String(x?.id) !== sid);
    if (next.length === list.length) return false;
    await client.set(KEY_MARKETPLACE_LISTINGS, JSON.stringify(next));
    return true;
  });
}

/* ── Negotiations ── */

export async function getNegotiations() {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_NEGOTIATIONS);
    const arr = raw ? JSON.parse(raw) : [];
    return arr.sort((a, b) => String(b?.updatedAt || "").localeCompare(String(a?.updatedAt || "")));
  });
}

export async function addNegotiation(record) {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_NEGOTIATIONS);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(record);
    await client.set(KEY_NEGOTIATIONS, JSON.stringify(list));
  });
}

export async function getNegotiationById(negId) {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_NEGOTIATIONS);
    const list = raw ? JSON.parse(raw) : [];
    return list.find((n) => String(n?.id) === String(negId)) || null;
  });
}

export async function patchNegotiation(negId, patch) {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_NEGOTIATIONS);
    const list = raw ? JSON.parse(raw) : [];
    const i = list.findIndex((n) => String(n?.id) === String(negId));
    if (i < 0) return null;
    list[i] = { ...list[i], ...patch, updatedAt: new Date().toISOString() };
    await client.set(KEY_NEGOTIATIONS, JSON.stringify(list));
    return list[i];
  });
}

export async function getNegotiationsByEmail(email) {
  const all = await getNegotiations();
  const e = String(email).toLowerCase().trim();
  return all.filter(
    (n) => String(n.customerEmail).toLowerCase() === e || String(n.providerEmail).toLowerCase() === e
  );
}

export async function getBookingsByEmail(email) {
  const all = await getBookings();
  const e = String(email).toLowerCase().trim();
  return all.filter((b) => String(b.email).toLowerCase() === e);
}

async function ensureSiteVisitsTotalSeeded(client) {
  if (await client.exists(KEY_SITE_VISITS_TOTAL)) return;
  const raw = await client.get(KEY_SITE_VISITS);
  let list = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(list)) list = [];
  await client.set(KEY_SITE_VISITS_TOTAL, String(Math.max(0, list.length)));
}

export async function appendSiteVisit(record) {
  if (!isKvRedisConfigured()) {
    devEnsureVisitCounterSynced();
    devSiteVisits.unshift(record);
    if (devSiteVisits.length > MAX_SITE_VISITS) devSiteVisits.length = MAX_SITE_VISITS;
    devSiteVisitTotal++;
    return;
  }
  return withRedis(async (client) => {
    await ensureSiteVisitsTotalSeeded(client);
    const raw = await client.get(KEY_SITE_VISITS);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];
    list.unshift(record);
    if (list.length > MAX_SITE_VISITS) list = list.slice(0, MAX_SITE_VISITS);
    await client.set(KEY_SITE_VISITS, JSON.stringify(list));
    await client.incr(KEY_SITE_VISITS_TOTAL);
  });
}

export async function getRecentSiteVisits(limit = 500) {
  const n = Math.min(Math.max(Number(limit) || 500, 1), 2000);
  if (!isKvRedisConfigured()) return devSiteVisits.slice(0, n);
  return withRedis(async (client) => {
    const raw = await client.get(KEY_SITE_VISITS);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list.slice(0, n);
  });
}

export async function getSiteVisitsTotal() {
  if (!isKvRedisConfigured()) {
    devEnsureVisitCounterSynced();
    return devSiteVisitTotal;
  }
  return withRedis(async (client) => {
    await ensureSiteVisitsTotalSeeded(client);
    const v = await client.get(KEY_SITE_VISITS_TOTAL);
    return Math.max(0, parseInt(String(v || "0"), 10) || 0);
  });
}

/** Public traffic summary: lifetime page loads + hashed unique visitors in the rolling KV window (last ~8k events). */
export async function getSiteVisitTrafficMetrics() {
  if (!isKvRedisConfigured()) {
    devEnsureVisitCounterSynced();
    return aggregateVisitTrafficFromList(devSiteVisits, devSiteVisitTotal);
  }
  return withRedis(async (client) => {
    await ensureSiteVisitsTotalSeeded(client);
    const totalStr = await client.get(KEY_SITE_VISITS_TOTAL);
    const totalPageViews = Math.max(0, parseInt(String(totalStr || "0"), 10) || 0);

    const raw = await client.get(KEY_SITE_VISITS);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];

    return aggregateVisitTrafficFromList(list, totalPageViews);
  });
}

const KEY_PROVIDER_OTP = (email) => `${PREFIX}:provider_otp:${normPushEmail(email)}`;
const KEY_OTP_COOLDOWN = (email) => `${PREFIX}:provider_otp_cd:${normPushEmail(email)}`;
const KEY_CUSTOMER_OTP = (email) => `${PREFIX}:customer_otp:${normPushEmail(email)}`;
const KEY_CUSTOMER_OTP_COOLDOWN = (email) => `${PREFIX}:customer_otp_cd:${normPushEmail(email)}`;
const KEY_CUSTOMER_PROFILE = (email) => `${PREFIX}:customer:${normPushEmail(email)}`;
const KEY_CUSTOMER_INDEX = `${PREFIX}:customers_index`;

function otpPepper() {
  return process.env.SESSION_SECRET || "dev-otp-pepper-change-me";
}

function hashOtpCode(code) {
  return crypto.createHash("sha256").update(String(code) + otpPepper()).digest("hex");
}

export async function isProviderOtpInCooldown(email) {
  const e = normPushEmail(email);
  if (!e) return true;
  return withRedis(async (client) => Boolean(await client.get(KEY_OTP_COOLDOWN(e))));
}

export async function setProviderOtpCooldown(email, sec = 45) {
  const e = normPushEmail(email);
  if (!e) return;
  return withRedis(async (client) => {
    await client.setex(KEY_OTP_COOLDOWN(e), sec, "1");
  });
}

export async function setProviderOtp(email, code, ttlSec = 900) {
  const e = normPushEmail(email);
  const hash = hashOtpCode(code);
  return withRedis(async (client) => {
    await client.setex(KEY_PROVIDER_OTP(e), ttlSec, JSON.stringify({ hash }));
  });
}

export async function verifyAndConsumeProviderOtp(email, code) {
  const e = normPushEmail(email);
  const want = hashOtpCode(code);
  return withRedis(async (client) => {
    const key = KEY_PROVIDER_OTP(e);
    const raw = await client.get(key);
    if (!raw) return false;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return false;
    }
    const ok = parsed?.hash === want;
    if (ok) await client.del(key);
    return ok;
  });
}

/* =====================================================================
 * Customer (shopper) auth: parallel to provider auth, separate keyspace.
 * Same one-time code email pattern, different cookies and KV keys.
 * ===================================================================== */
export async function isCustomerOtpInCooldown(email) {
  const e = normPushEmail(email);
  if (!e) return true;
  if (!isKvRedisConfigured()) return false;
  return withRedis(async (client) => Boolean(await client.get(KEY_CUSTOMER_OTP_COOLDOWN(e))));
}

export async function setCustomerOtpCooldown(email, sec = 45) {
  const e = normPushEmail(email);
  if (!e) return;
  if (!isKvRedisConfigured()) return;
  return withRedis(async (client) => {
    await client.setex(KEY_CUSTOMER_OTP_COOLDOWN(e), sec, "1");
  });
}

export async function setCustomerOtp(email, code, ttlSec = 900) {
  const e = normPushEmail(email);
  const hash = hashOtpCode(code);
  if (!isKvRedisConfigured()) return;
  return withRedis(async (client) => {
    await client.setex(KEY_CUSTOMER_OTP(e), ttlSec, JSON.stringify({ hash }));
  });
}

export async function verifyAndConsumeCustomerOtp(email, code) {
  const e = normPushEmail(email);
  const want = hashOtpCode(code);
  if (!isKvRedisConfigured()) return false;
  return withRedis(async (client) => {
    const key = KEY_CUSTOMER_OTP(e);
    const raw = await client.get(key);
    if (!raw) return false;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return false;
    }
    const ok = parsed?.hash === want;
    if (ok) await client.del(key);
    return ok;
  });
}

/* =====================================================================
 * Customer password accounts (Redis) — sessions, bcrypt users, OTP verify
 * Dev fallback when KV_REDIS_URL unset: keep auth working in-memory.
 * ===================================================================== */

const KEY_CUSTOMER_AUTH_USER = (email) => `${PREFIX}:customer_auth:${normPushEmail(email)}`;
const KEY_CUSTOMER_AUTH_SESSION = (sid) => `${PREFIX}:cust_sid:${sid}`;
const KEY_CUSTOMER_EMAIL_VERIFY_OTP = (email) => `${PREFIX}:cust_email_verify:${normPushEmail(email)}`;
const KEY_CUSTOMER_EMAIL_VERIFY_CD = (email) => `${PREFIX}:cust_email_verify_cd:${normPushEmail(email)}`;
const KEY_CUSTOMER_PWRESET_OTP = (email) => `${PREFIX}:cust_pwreset:${normPushEmail(email)}`;
const KEY_CUSTOMER_PWRESET_CD = (email) => `${PREFIX}:cust_pwreset_cd:${normPushEmail(email)}`;

const devCustomerAuthUsers = new Map(); // emailNorm -> plain object
const devCustomerAuthSessions = new Map(); // sid -> { email, expUnix }
const devCustEmailVerifyOtpHash = new Map(); // email -> { hash, expMs, userId?, attemptsBad }
const devCustEmailVerifyCd = new Map(); // email -> expMs (resend/register cooldown without Redis)

/** Verified-email OTP TTL (seconds). Minimum 600 (10 minutes). */
export const CUSTOMER_EMAIL_VERIFY_TTL_SEC = 600;

/** Seconds before another verification email may be requested. */
export const CUSTOMER_EMAIL_VERIFY_RESEND_COOLDOWN_SEC = 30;

const CUSTOMER_EMAIL_VERIFY_MAX_BAD_ATTEMPTS = 10;

function normalizeEmailVerifyTtlSec(ttlSec) {
  const n = Math.floor(Number(ttlSec));
  if (!Number.isFinite(n)) return CUSTOMER_EMAIL_VERIFY_TTL_SEC;
  return Math.min(86400, Math.max(600, n));
}

function sanitizeEmailVerifyUserRef(userId) {
  const s = String(userId ?? "").trim().slice(0, 128);
  return s || "";
}

const devCustPwResetOtpHash = new Map(); // email -> { hash, expMs }

async function kvGetCustomerAuthUser(email) {
  const e = normPushEmail(email);
  if (!e) return null;
  if (!isKvRedisConfigured()) {
    const u = devCustomerAuthUsers.get(e);
    return u && typeof u === "object" ? { ...u, email: e } : null;
  }
  const raw = await withRedis(async (client) => client.get(KEY_CUSTOMER_AUTH_USER(e)));
  if (!raw) return null;
  try {
    const o = JSON.parse(raw);
    if (!o || typeof o !== "object") return null;
    return { ...o, email: e };
  } catch {
    return null;
  }
}

async function kvSaveCustomerAuthUser(user) {
  const e = normPushEmail(user?.email || "");
  if (!e || !user || typeof user !== "object") return null;
  const row = {
    ...user,
    email: e,
    updatedAt: new Date().toISOString(),
  };
  if (!isKvRedisConfigured()) {
    devCustomerAuthUsers.set(e, { ...row });
    return row;
  }
  return withRedis(async (client) => {
    await client.set(KEY_CUSTOMER_AUTH_USER(e), JSON.stringify(row));
    return row;
  });
}

/** Includes password_hash field — handlers only / never expose publicly. */
export async function getCustomerAuthUserRecord(email) {
  return kvGetCustomerAuthUser(email);
}

/** @returns {{ email:string, emailVerified:boolean } | null} */
export async function getCustomerAuthPayloadForEmail(email) {
  const u = await kvGetCustomerAuthUser(email);
  if (!u) return null;
  return {
    email: u.email,
    emailVerified: Boolean(u.emailVerified),
    role: String(u.role || "customer"),
  };
}

/** Create or overwrite password-backed customer record (caller validates uniqueness). */
export async function upsertCustomerAuthPendingUser({
  email,
  passwordHash,
  firstName,
  lastName,
  phone,
  city,
}) {
  const e = normPushEmail(email);
  if (!e) return null;
  const existing = await kvGetCustomerAuthUser(e);
  if (existing?.emailVerified === true) return null;
  const nowIso = new Date().toISOString();
  const id = existing?.id || `cu_${crypto.randomBytes(9).toString("hex")}`;
  const row = {
    id,
    email: e,
    passwordHash: String(passwordHash || ""),
    firstName: String(firstName || "").trim().slice(0, 80),
    lastName: String(lastName || "").trim().slice(0, 80),
    phone: String(phone || "").trim().slice(0, 40),
    city: String(city || "").trim().slice(0, 80),
    role: "customer",
    emailVerified: false,
    createdAt: existing?.createdAt || nowIso,
    updatedAt: nowIso,
  };
  return kvSaveCustomerAuthUser(row);
}

export async function setCustomerVerifiedAndPassword(email, verified, passwordHashIfSet) {
  const e = normPushEmail(email);
  const u = await kvGetCustomerAuthUser(e);
  if (!u) return null;
  const next = { ...u, emailVerified: verified === true };
  if (passwordHashIfSet != null && String(passwordHashIfSet)) next.passwordHash = String(passwordHashIfSet);
  return kvSaveCustomerAuthUser(next);
}

export async function updateCustomerPasswordHash(email, hash) {
  const e = normPushEmail(email);
  const u = await kvGetCustomerAuthUser(e);
  if (!u) return null;
  return kvSaveCustomerAuthUser({ ...u, passwordHash: String(hash || "") });
}

export async function isCustomerEmailVerifyCooldown(email) {
  const e = normPushEmail(email);
  if (!e) return true;
  if (!isKvRedisConfigured()) {
    const until = devCustEmailVerifyCd.get(e);
    return typeof until === "number" && until > Date.now();
  }
  return withRedis(async (client) => Boolean(await client.get(KEY_CUSTOMER_EMAIL_VERIFY_CD(e))));
}

export async function setCustomerEmailVerifyCooldown(email, sec = CUSTOMER_EMAIL_VERIFY_RESEND_COOLDOWN_SEC) {
  const e = normPushEmail(email);
  if (!e) return;
  const cd = Math.max(1, Math.floor(Number(sec) || CUSTOMER_EMAIL_VERIFY_RESEND_COOLDOWN_SEC));
  if (!isKvRedisConfigured()) {
    devCustEmailVerifyCd.set(e, Date.now() + cd * 1000);
    return;
  }
  return withRedis(async (client) => {
    await client.setex(KEY_CUSTOMER_EMAIL_VERIFY_CD(e), cd, "1");
  });
}

/** Remaining cooldown seconds before resend/register can send another code (0 if none). */
export async function getCustomerEmailVerifyCooldownRemainingSec(email) {
  const e = normPushEmail(email);
  if (!e) return 0;
  if (!isKvRedisConfigured()) {
    const until = devCustEmailVerifyCd.get(e);
    if (typeof until !== "number") return 0;
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
  }
  return withRedis(async (client) => {
    const t = await client.ttl(KEY_CUSTOMER_EMAIL_VERIFY_CD(e));
    return t > 0 ? t : 0;
  });
}

export async function setCustomerEmailVerifyOtp(email, code, ttlSec, userId) {
  const e = normPushEmail(email);
  const hash = hashOtpCode(code);
  const ttl = normalizeEmailVerifyTtlSec(ttlSec);
  const userRef = sanitizeEmailVerifyUserRef(userId);
  const payload = JSON.stringify({
    hash,
    attemptsBad: 0,
    userId: userRef,
  });
  if (!isKvRedisConfigured()) {
    devCustEmailVerifyOtpHash.set(e, { hash, expMs: Date.now() + ttl * 1000, userId: userRef, attemptsBad: 0 });
    return;
  }
  return withRedis(async (client) => {
    await client.setex(KEY_CUSTOMER_EMAIL_VERIFY_OTP(e), ttl, payload);
  });
}

/**
 * Validates and consumes a single-use email verification code (hashed at rest).
 * @returns {Promise<{ ok: true } | { ok: false, reason: 'missing' | 'invalid' | 'too_many_attempts' }>}
 */
export async function consumeCustomerEmailVerifyCode(email, code, expectUserId) {
  const e = normPushEmail(email);
  const want = hashOtpCode(code);
  const expectRef = sanitizeEmailVerifyUserRef(expectUserId);

  if (!isKvRedisConfigured()) {
    const row = devCustEmailVerifyOtpHash.get(e);
    if (!row || row.expMs < Date.now()) {
      devCustEmailVerifyOtpHash.delete(e);
      return { ok: false, reason: "missing" };
    }
    if (expectRef && row.userId && row.userId !== expectRef) {
      devCustEmailVerifyOtpHash.delete(e);
      return { ok: false, reason: "missing" };
    }
    if (row.hash !== want) {
      const attempts = Math.max(0, Math.floor(Number(row.attemptsBad) || 0)) + 1;
      if (attempts >= CUSTOMER_EMAIL_VERIFY_MAX_BAD_ATTEMPTS) {
        devCustEmailVerifyOtpHash.delete(e);
        return { ok: false, reason: "too_many_attempts" };
      }
      devCustEmailVerifyOtpHash.set(e, { ...row, attemptsBad: attempts });
      return { ok: false, reason: "invalid" };
    }
    devCustEmailVerifyOtpHash.delete(e);
    return { ok: true };
  }

  return withRedis(async (client) => {
    const key = KEY_CUSTOMER_EMAIL_VERIFY_OTP(e);
    const raw = await client.get(key);
    if (!raw) return { ok: false, reason: "missing" };

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      await client.del(key);
      return { ok: false, reason: "missing" };
    }

    const storedUser = sanitizeEmailVerifyUserRef(parsed?.userId);
    if (expectRef && storedUser && storedUser !== expectRef) {
      await client.del(key);
      return { ok: false, reason: "missing" };
    }

    if (parsed?.hash !== want) {
      const pttl = await client.pttl(key);
      if (pttl <= 0) {
        await client.del(key);
        return { ok: false, reason: "missing" };
      }
      const attempts = Math.max(0, Math.floor(Number(parsed.attemptsBad) || 0)) + 1;
      if (attempts >= CUSTOMER_EMAIL_VERIFY_MAX_BAD_ATTEMPTS) {
        await client.del(key);
        return { ok: false, reason: "too_many_attempts" };
      }
      const next = { ...parsed, hash: parsed.hash, attemptsBad: attempts };
      if (storedUser) next.userId = storedUser;
      await client.psetex(key, pttl, JSON.stringify(next));
      return { ok: false, reason: "invalid" };
    }

    await client.del(key);
    return { ok: true };
  });
}

/** @deprecated Prefer consumeCustomerEmailVerifyCode (attempt limits + user binding). */
export async function verifyAndConsumeCustomerEmailVerifyOtp(email, code) {
  const r = await consumeCustomerEmailVerifyCode(email, code, "");
  return r.ok === true;
}

export async function isCustomerPwResetCooldown(email) {
  const e = normPushEmail(email);
  if (!e) return true;
  if (!isKvRedisConfigured()) return false;
  return withRedis(async (client) => Boolean(await client.get(KEY_CUSTOMER_PWRESET_CD(e))));
}

export async function setCustomerPwResetCooldown(email, sec = 60) {
  const e = normPushEmail(email);
  if (!e) return;
  if (!isKvRedisConfigured()) return;
  return withRedis(async (client) => {
    await client.setex(KEY_CUSTOMER_PWRESET_CD(e), sec, "1");
  });
}

export async function setCustomerPwResetOtp(email, code, ttlSec = 900) {
  const e = normPushEmail(email);
  const hash = hashOtpCode(code);
  if (!isKvRedisConfigured()) {
    devCustPwResetOtpHash.set(e, { hash, expMs: Date.now() + ttlSec * 1000 });
    return;
  }
  return withRedis(async (client) => {
    await client.setex(KEY_CUSTOMER_PWRESET_OTP(e), ttlSec, JSON.stringify({ hash }));
  });
}

export async function verifyAndConsumeCustomerPwResetOtp(email, code) {
  const e = normPushEmail(email);
  const want = hashOtpCode(code);
  if (!isKvRedisConfigured()) {
    const row = devCustPwResetOtpHash.get(e);
    if (!row || row.expMs < Date.now()) {
      devCustPwResetOtpHash.delete(e);
      return false;
    }
    if (row.hash !== want) return false;
    devCustPwResetOtpHash.delete(e);
    return true;
  }
  return withRedis(async (client) => {
    const key = KEY_CUSTOMER_PWRESET_OTP(e);
    const raw = await client.get(key);
    if (!raw) return false;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return false;
    }
    const ok = parsed?.hash === want;
    if (ok) await client.del(key);
    return ok;
  });
}

export async function createCustomerAuthSession(email, ttlSec) {
  const e = normPushEmail(email);
  if (!e) return null;
  const sid = crypto.randomBytes(32).toString("hex");
  const exp = Math.floor(Date.now() / 1000) + Math.max(60, Number(ttlSec) || 86400);
  const row = JSON.stringify({ email: e, exp });
  if (!isKvRedisConfigured()) {
    devCustomerAuthSessions.set(sid, { email: e, exp });
    return { sid, exp };
  }
  await withRedis(async (client) => {
    await client.setex(KEY_CUSTOMER_AUTH_SESSION(sid), Math.max(60, Number(ttlSec) || 86400), row);
  });
  return { sid, exp };
}

export async function getCustomerAuthSession(sid) {
  if (!sid || typeof sid !== "string") return null;
  if (!isKvRedisConfigured()) {
    const v = devCustomerAuthSessions.get(sid);
    if (!v || v.exp < Math.floor(Date.now() / 1000)) {
      devCustomerAuthSessions.delete(sid);
      return null;
    }
    return { email: v.email, exp: v.exp };
  }
  const raw = await withRedis(async (client) => client.get(KEY_CUSTOMER_AUTH_SESSION(sid)));
  if (!raw) return null;
  try {
    const o = JSON.parse(raw);
    if (!o?.email || typeof o.exp !== "number") return null;
    if (o.exp < Math.floor(Date.now() / 1000)) return null;
    return { email: String(o.email).toLowerCase(), exp: o.exp };
  } catch {
    return null;
  }
}

export async function deleteCustomerAuthSession(sid) {
  if (!sid) return;
  if (!isKvRedisConfigured()) {
    devCustomerAuthSessions.delete(sid);
    return;
  }
  await withRedis(async (client) => {
    await client.del(KEY_CUSTOMER_AUTH_SESSION(sid));
  });
}

/**
 * Lightweight fixed-window counters for auth brute-force damping.
 */
export async function authRateConsume(ip, bucket, limit, windowSec) {
  const keyIp = normPushIp(ip);
  if (!limit || limit < 1) return false;
  if (!keyIp) return false;
  const key = `${PREFIX}:cust_rl:${bucket}:${keyIp}`;
  if (!isKvRedisConfigured()) return false;
  return withRedis(async (client) => {
    const n = await client.incr(key);
    if (n === 1) await client.expire(key, Math.max(10, windowSec));
    return n > limit;
  });
}

function normPushIp(ip) {
  return String(ip || "")
    .trim()
    .slice(0, 64)
    .replace(/^::ffff:/, "");
}

function blankCustomerProfile(email) {
  const e = normPushEmail(email);
  const now = new Date().toISOString();
  return {
    email: e,
    firstName: "",
    lastName: "",
    phone: "",
    whatsappOptIn: false,
    marketingOptIn: false,
    savedStoreIds: [],
    marketplaceCarts: {},
    addresses: [],
    preferredArea: "",
    preferredPostcode: "",
    accountSetupComplete: false,
    termsAcceptedAt: "",
    createdAt: now,
    lastSeenAt: now,
  };
}

/** Returns null if no profile exists. */
export async function getCustomerProfile(email) {
  const e = normPushEmail(email);
  if (!e) return null;
  if (!isKvRedisConfigured()) return null;
  return withRedis(async (client) => {
    const raw = await client.get(KEY_CUSTOMER_PROFILE(e));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return { ...blankCustomerProfile(e), ...parsed, email: e };
    } catch {
      return null;
    }
  });
}

/** Ensures a profile exists; returns the live profile. */
export async function ensureCustomerProfile(email) {
  const e = normPushEmail(email);
  if (!e) return null;
  if (!isKvRedisConfigured()) return blankCustomerProfile(e);
  return withRedis(async (client) => {
    const raw = await client.get(KEY_CUSTOMER_PROFILE(e));
    let profile;
    if (raw) {
      try {
        profile = JSON.parse(raw);
      } catch {
        profile = null;
      }
    }
    if (!profile || typeof profile !== "object") {
      profile = blankCustomerProfile(e);
      await client.set(KEY_CUSTOMER_PROFILE(e), JSON.stringify(profile));
      await client.sadd(KEY_CUSTOMER_INDEX, e);
    } else {
      profile = { ...blankCustomerProfile(e), ...profile, email: e };
      if (profile.accountSetupComplete !== true) {
        const fn = String(profile.firstName || "").trim();
        const ln = String(profile.lastName || "").trim();
        const d = String(profile.phone || "").replace(/\D/g, "");
        const area = String(profile.preferredArea || "").trim();
        const pc = String(profile.preferredPostcode || "")
          .replace(/[^0-9A-Za-z]/g, "")
          .toUpperCase();
        const pcOk = pc.length >= 5 && pc.length <= 8 && /^[A-Z]{1,2}\d[A-Z0-9]?\d[A-Z]{2}$/.test(pc);
        let hasSignupAddress = false;
        const addrList = Array.isArray(profile.addresses) ? profile.addresses : [];
        for (const a of addrList) {
          if (!a || typeof a !== "object") continue;
          const line1 = String(a.line1 || "").trim();
          const city = String(a.city || "").trim();
          const apc = String(a.postcode || "").replace(/[^0-9A-Za-z]/g, "").toUpperCase();
          const apcOk = apc.length >= 5 && apc.length <= 8 && /^[A-Z]{1,2}\d[A-Z0-9]?\d[A-Z]{2}$/.test(apc);
          if (line1.length >= 5 && city.length >= 2 && apcOk) {
            hasSignupAddress = true;
            break;
          }
        }
        if (fn && ln && d.length >= 10 && area && pcOk && hasSignupAddress) {
          profile.accountSetupComplete = true;
          if (!profile.termsAcceptedAt) profile.termsAcceptedAt = profile.createdAt || profile.lastSeenAt || new Date().toISOString();
        }
      }
      profile.lastSeenAt = new Date().toISOString();
      await client.set(KEY_CUSTOMER_PROFILE(e), JSON.stringify(profile));
      await client.sadd(KEY_CUSTOMER_INDEX, e);
    }
    return profile;
  });
}

/** Merge `patch` into the profile. Caller must validate field names. */
export async function patchCustomerProfile(email, patch) {
  const e = normPushEmail(email);
  if (!e) return null;
  if (!isKvRedisConfigured()) return null;
  return withRedis(async (client) => {
    const raw = await client.get(KEY_CUSTOMER_PROFILE(e));
    let profile = blankCustomerProfile(e);
    if (raw) {
      try {
        profile = { ...profile, ...JSON.parse(raw) };
      } catch {
        // keep blank
      }
    }
    profile = { ...profile, ...(patch && typeof patch === "object" ? patch : {}), email: e };
    profile.lastSeenAt = new Date().toISOString();
    await client.set(KEY_CUSTOMER_PROFILE(e), JSON.stringify(profile));
    await client.sadd(KEY_CUSTOMER_INDEX, e);
    return profile;
  });
}

/** Admin/debug: total registered customers count. */
export async function getCustomerCount() {
  if (!isKvRedisConfigured()) return 0;
  return withRedis(async (client) => {
    const n = await client.scard(KEY_CUSTOMER_INDEX);
    return Number(n) || 0;
  });
}

/** Founder/personal hairdressing profile (legacy Dim's Haircare card) — not a Clip grocery storefront. */
function isArchivedFounderHairProfile(listing) {
  if (!listing || typeof listing !== "object") return false;
  if (listing.excludeFromBrowse === true) return true;

  const role = String(listing.role || "").trim();
  const bio = String(listing.bio || "");
  const svc = Array.isArray(listing.services) ? listing.services.join(", ") : "";
  const oneLine = `${role} ${bio} ${svc}`.replace(/\s+/g, " ").trim();

  if (/^\s*sonia\s+otikpa\s*$/i.test(role)) return true;

  if (/braids,?\s*revamping/i.test(oneLine) && /wigging|wig install/i.test(oneLine)) return true;
  if (/\bmachine\s+wigging\b/i.test(oneLine) || /\bhand\s+(and|,)?\s*machine\s+wigg/i.test(oneLine))
    return true;

  if (
    /\bprofessional\s+hairstylist\b/i.test(bio) &&
    /\b(years?\s+of\s+experience|4\s*years)\b/i.test(bio) &&
    /\bhigh[\s-]quality\b/i.test(bio)
  )
    return true;

  return false;
}

/**
 * Listings visible on the public directory, /api/listings, search, and sitemap.
 * Onboarding drafts: pending (until admin approves) and rejected stay hidden.
 * approved and active profiles are shown; legacy rows without applicationStatus remain shown.
 */
export function isListingPubliclyVisible(listing) {
  if (listing?.applicationStatus === "pending") return false;
  if (listing?.applicationStatus === "rejected") return false;
  if (isArchivedFounderHairProfile(listing)) return false;
  return true;
}

export async function addOnboardingApplication(record) {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_ONBOARDING_APPLICATIONS);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];
    list.unshift(record);
    if (list.length > 500) list = list.slice(0, 500);
    await client.set(KEY_ONBOARDING_APPLICATIONS, JSON.stringify(list));
  });
}

export async function getOnboardingApplications() {
  if (!isKvRedisConfigured()) return [];
  return withRedis(async (client) => {
    const raw = await client.get(KEY_ONBOARDING_APPLICATIONS);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  });
}

const ANALYTICS_KEYS = [
  "viewsStoreApply",
  "viewsStallApply",
  "submissionsStore",
  "submissionsStall",
];

export async function incrementOnboardingMetric(key) {
  if (!ANALYTICS_KEYS.includes(key)) return;
  if (!isKvRedisConfigured()) return;
  return withRedis(async (client) => {
    const raw = await client.get(KEY_ONBOARDING_ANALYTICS);
    let o = raw ? JSON.parse(raw) : {};
    if (typeof o !== "object" || !o) o = {};
    o[key] = Number(o[key] || 0) + 1;
    o.updatedAt = new Date().toISOString();
    await client.set(KEY_ONBOARDING_ANALYTICS, JSON.stringify(o));
  });
}

export async function getOnboardingAnalyticsCounters() {
  if (!isKvRedisConfigured()) {
    const out = {};
    for (const k of ANALYTICS_KEYS) out[k] = 0;
    out.updatedAt = null;
    return out;
  }
  return withRedis(async (client) => {
    const raw = await client.get(KEY_ONBOARDING_ANALYTICS);
    let o = raw ? JSON.parse(raw) : {};
    if (typeof o !== "object" || !o) o = {};
    const out = {};
    for (const k of ANALYTICS_KEYS) {
      out[k] = Number(o[k] || 0);
    }
    out.updatedAt = o.updatedAt || null;
    return out;
  });
}

const STORE_ANALYTICS_PREFIX = `${PREFIX}:sa:`;

/** Increment per-store funnel metrics (used by store page + dashboard). */
export async function incrementStoreAnalytics(listingId, event, productIdx) {
  const id = String(listingId || "")
    .replace(/[^\w-]/g, "")
    .slice(0, 64);
  if (!id) return;
  const allowed = new Set(["view", "add_basket", "basket_open", "checkout_start", "order_complete", "review_submitted"]);
  if (!allowed.has(event)) return;
  if (!isKvRedisConfigured()) return;
  return withRedis(async (client) => {
    const key = `${STORE_ANALYTICS_PREFIX}${id}`;
    await client.hincrby(key, event, 1);
    if (productIdx !== undefined && productIdx !== null) {
      const pi = Math.floor(Number(productIdx));
      if (Number.isInteger(pi) && pi >= 0 && pi < 40) {
        await client.hincrby(key, `p_${pi}`, 1);
      }
    }
    await client.expire(key, 60 * 60 * 24 * 400);
  });
}

const KEY_PLATFORM_FUNNEL = `${PREFIX}:platform_order_funnel`;

/** Site-wide order funnel (aggregated for /impact and admin). */
export async function incrementPlatformFunnel(event) {
  const allowed = new Set(["view", "add_basket", "basket_open", "checkout_start", "order_complete", "review_submitted"]);
  const ev = String(event || "").trim();
  if (!allowed.has(ev)) return;
  if (!isKvRedisConfigured()) return;
  return withRedis(async (client) => {
    await client.hincrby(KEY_PLATFORM_FUNNEL, ev, 1);
    await client.expire(KEY_PLATFORM_FUNNEL, 60 * 60 * 24 * 400);
  });
}

export async function getPlatformFunnel() {
  if (!isKvRedisConfigured()) {
    return {
      view: 0,
      add_basket: 0,
      basket_open: 0,
      checkout_start: 0,
      order_complete: 0,
      review_submitted: 0,
    };
  }
  return withRedis(async (client) => {
    const h = await client.hgetall(KEY_PLATFORM_FUNNEL);
    const o = h || {};
    return {
      view: Number(o.view || 0),
      add_basket: Number(o.add_basket || 0),
      basket_open: Number(o.basket_open || 0),
      checkout_start: Number(o.checkout_start || 0),
      order_complete: Number(o.order_complete || 0),
      review_submitted: Number(o.review_submitted || 0),
    };
  });
}

const KEY_PWA_METRICS = `${PREFIX}:pwa_metrics`;
const KEY_PWA_DAILY_OPENS = `${PREFIX}:pwa_daily_opens`;

const PWA_METRIC_KEYS = new Set([
  "install_prompt_shown",
  "install_cta_click",
  "install_dismiss_7d",
  "appinstalled",
  "standalone_session",
  "order_completed_in_pwa",
]);

/** Counters for PWA install funnel and usage (admin + impact). */
export async function incrementPwaMetric(field, n = 1) {
  const f = String(field || "").trim();
  if (!PWA_METRIC_KEYS.has(f)) return;
  if (!isKvRedisConfigured()) return;
  const add = Math.max(1, Math.min(1000, Math.floor(Number(n) || 1)));
  return withRedis(async (client) => {
    await client.hincrby(KEY_PWA_METRICS, f, add);
    await client.expire(KEY_PWA_METRICS, 60 * 60 * 24 * 400);
  });
}

/** One increment per standalone app open (proxy for engagement; not unique users). */
export async function incrementPwaDailyOpen() {
  if (!isKvRedisConfigured()) return;
  const day = new Date().toISOString().slice(0, 10);
  return withRedis(async (client) => {
    await client.hincrby(KEY_PWA_DAILY_OPENS, day, 1);
    await client.expire(KEY_PWA_DAILY_OPENS, 60 * 60 * 24 * 120);
  });
}

export async function getPwaMetrics() {
  if (!isKvRedisConfigured()) {
    const out = {};
    for (const k of PWA_METRIC_KEYS) out[k] = 0;
    return {
      ...out,
      dau14Sum: 0,
      dau14Days: 0,
      installConversionPct: null,
      last14Days: [],
    };
  }
  return withRedis(async (client) => {
    const h = await client.hgetall(KEY_PWA_METRICS);
    const o = h || {};
    const out = {};
    for (const k of PWA_METRIC_KEYS) {
      out[k] = Number(o[k] || 0);
    }
    const dau = await client.hgetall(KEY_PWA_DAILY_OPENS);
    const days = Object.keys(dau || {})
      .sort()
      .slice(-14);
    let dau14 = 0;
    for (const day of days) dau14 += Number(dau[day] || 0);
    const shown = out.install_prompt_shown || 0;
    const installed = out.appinstalled || 0;
    const installConversionPct = shown > 0 ? Math.round((1000 * installed) / shown) / 10 : null;
    return {
      ...out,
      dau14Sum: dau14,
      dau14Days: days.length,
      installConversionPct,
      last14Days: days.map((day) => ({ day, opens: Number(dau[day] || 0) })),
    };
  });
}

const KEY_SEARCH_TERM_COUNTS = `${PREFIX}:search_terms`;
const KEY_SEARCH_NORESULT_COUNTS = `${PREFIX}:search_noresults`;

export async function recordSearchQuery(normalizedTerm, resultCount) {
  const t = String(normalizedTerm || "")
    .toLowerCase()
    .trim()
    .slice(0, 80);
  if (t.length < 2) return;
  if (!isKvRedisConfigured()) return;
  return withRedis(async (client) => {
    await client.hincrby(KEY_SEARCH_TERM_COUNTS, t, 1);
    if (Number(resultCount) === 0) {
      await client.hincrby(KEY_SEARCH_NORESULT_COUNTS, t, 1);
    }
  });
}

const KEY_SEARCH_FUNNEL = `${PREFIX}:search_funnel`;
const KEY_SEARCH_TERM_QUICKADD = `${PREFIX}:search_term_quickadd`;
const KEY_SEARCH_TERM_PRODUCTCLK = `${PREFIX}:search_term_productclk`;
const KEY_SEARCH_TERM_STORECLK = `${PREFIX}:search_term_storeclk`;
const KEY_SEARCH_TERM_VIEWSTORE = `${PREFIX}:search_term_viewstore`;

/** Public search UI events (dropdown / results) for funnel + admin. */
export async function recordSearchEvent(event, queryHint) {
  const allowed = new Set(["product_click", "store_click", "quick_add", "view_store"]);
  const ev = String(event || "").trim();
  if (!allowed.has(ev)) return;
  const t = String(queryHint || "")
    .toLowerCase()
    .trim()
    .slice(0, 80);
  if (!isKvRedisConfigured()) return;
  return withRedis(async (client) => {
    await client.hincrby(KEY_SEARCH_FUNNEL, ev, 1);
    if (t.length >= 2) {
      const key =
        ev === "quick_add"
          ? KEY_SEARCH_TERM_QUICKADD
          : ev === "product_click"
            ? KEY_SEARCH_TERM_PRODUCTCLK
            : ev === "store_click"
              ? KEY_SEARCH_TERM_STORECLK
              : ev === "view_store"
                ? KEY_SEARCH_TERM_VIEWSTORE
                : null;
      if (key) await client.hincrby(key, t, 1);
    }
  });
}

export async function getSearchAnalyticsSummary() {
  if (!isKvRedisConfigured()) {
    return {
      topTerms: [],
      noResultsTerms: [],
      funnel: { productClick: 0, storeClick: 0, quickAdd: 0, viewStore: 0 },
      topQuickAddTerms: [],
      topProductClickTerms: [],
      topStoreClickTerms: [],
      topViewStoreTerms: [],
      ctrEngagementApprox: "0",
    };
  }
  return withRedis(async (client) => {
    const terms = await client.hgetall(KEY_SEARCH_TERM_COUNTS);
    const nores = await client.hgetall(KEY_SEARCH_NORESULT_COUNTS);
    const funnelRaw = await client.hgetall(KEY_SEARCH_FUNNEL);
    const topTerms = Object.entries(terms || {})
      .map(([term, v]) => ({ term, count: Number(v || 0) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);
    const noResultsTerms = Object.entries(nores || {})
      .map(([term, v]) => ({ term, count: Number(v || 0) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    const funnel = {
      productClick: Number(funnelRaw?.product_click || 0),
      storeClick: Number(funnelRaw?.store_click || 0),
      quickAdd: Number(funnelRaw?.quick_add || 0),
      viewStore: Number(funnelRaw?.view_store || 0),
    };
    const sumSearches = topTerms.reduce((s, x) => s + x.count, 0);

    const sortTermHash = async (key) => {
      const h = await client.hgetall(key);
      return Object.entries(h || {})
        .map(([term, v]) => ({ term, count: Number(v || 0) }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    };
    const topQuickAddTerms = await sortTermHash(KEY_SEARCH_TERM_QUICKADD);
    const topProductClickTerms = await sortTermHash(KEY_SEARCH_TERM_PRODUCTCLK);
    const topStoreClickTerms = await sortTermHash(KEY_SEARCH_TERM_STORECLK);
    const topViewStoreTerms = await sortTermHash(KEY_SEARCH_TERM_VIEWSTORE);

    const searchVolume = sumSearches || 1;
    const engagement = funnel.productClick + funnel.storeClick + funnel.quickAdd + funnel.viewStore;
    const ctrApprox = searchVolume > 0 ? ((engagement / searchVolume) * 100).toFixed(2) : "0";

    return {
      topTerms,
      noResultsTerms,
      funnel,
      topQuickAddTerms,
      topProductClickTerms,
      topStoreClickTerms,
      topViewStoreTerms,
      ctrEngagementApprox: ctrApprox,
    };
  });
}

export async function getStoreAnalyticsCounters(listingId) {
  const id = String(listingId || "").trim();
  if (!id) return null;
  if (!isKvRedisConfigured()) {
    return {
      view: 0,
      add_basket: 0,
      basket_open: 0,
      checkout_start: 0,
      order_complete: 0,
      review_submitted: 0,
      productAdds: {},
      updatedAt: null,
    };
  }
  return withRedis(async (client) => {
    const raw = await client.hgetall(`${STORE_ANALYTICS_PREFIX}${id}`);
    if (!raw || typeof raw !== "object") return { view: 0, add_basket: 0, checkout_start: 0, order_complete: 0, productAdds: {} };
    const out = {
      view: Number(raw.view || 0),
      add_basket: Number(raw.add_basket || 0),
      checkout_start: Number(raw.checkout_start || 0),
      order_complete: Number(raw.order_complete || 0),
      productAdds: {},
    };
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith("p_")) {
        const idx = k.slice(2);
        out.productAdds[idx] = Number(v || 0);
      }
    }
    return out;
  });
}

/* ── WhatsApp Cloud API metrics & scheduled jobs ── */

const KEY_WA_METRICS = `${PREFIX}:wa_metrics`;
const KEY_WA_JOBS_Z = `${PREFIX}:wa_jobs_z`;
const KEY_WA_LISTING_LAST_ORDER = `${PREFIX}:wa_listing_lastorder`;
const KEY_WA_ONBOARD_48H_SENT = `${PREFIX}:wa_onboard48_sent`;
const KEY_WA_INACTIVE_NUDGE = `${PREFIX}:wa_inactive_nudge_ts`;
const KEY_WA_WEEKLY_SENT = `${PREFIX}:wa_weekly_sent_wk`;
const KEY_WA_NT_WEEK = `${PREFIX}:wa_nt_week`;

function waJobDataKey(id) {
  return `${PREFIX}:wa_job:${id}`;
}

function isoWeekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const w1 = new Date(Date.UTC(y, 0, 1));
  const w = Math.ceil(((t - w1) / 86400000 + 1) / 7);
  return `${y}-W${String(w).padStart(2, "0")}`;
}

const WA_METRIC_DENY = new Set(["__proto__", "constructor", "prototype"]);

export async function incrementWhatsAppMetric(field, n = 1) {
  const f = String(field || "")
    .trim()
    .replace(/[^\w-]/g, "")
    .slice(0, 64);
  if (!f || WA_METRIC_DENY.has(f)) return;
  const add = Math.max(1, Math.min(10000, Math.floor(Number(n) || 1)));
  if (!isKvRedisConfigured()) return;
  return withRedis(async (client) => {
    await client.hincrby(KEY_WA_METRICS, f, add);
    await client.expire(KEY_WA_METRICS, 60 * 60 * 24 * 800);
  });
}

export async function getWhatsAppMetrics() {
  if (!isKvRedisConfigured()) {
    return { total: 0, byType: {} };
  }
  return withRedis(async (client) => {
    const h = await client.hgetall(KEY_WA_METRICS);
    const o = h || {};
    return {
      total: Number(o.total || 0),
      byType: o,
    };
  });
}

export async function setListingLastOrderAt(listingId, ts = Date.now()) {
  const id = String(listingId || "")
    .trim()
    .slice(0, 32);
  if (!id) return;
  return withRedis(async (client) => {
    await client.hset(KEY_WA_LISTING_LAST_ORDER, id, String(ts));
    await client.expire(KEY_WA_LISTING_LAST_ORDER, 60 * 60 * 24 * 400);
  });
}

export async function getListingLastOrderMap() {
  return withRedis(async (client) => {
    const h = await client.hgetall(KEY_WA_LISTING_LAST_ORDER);
    return h && typeof h === "object" ? h : {};
  });
}

/**
 * Max 2 non-transactional WhatsApp messages per rolling ISO week per recipient.
 * Returns { ok: true } if allowed, { ok: false } if cap reached.
 */
export async function tryWhatsAppNonTransactionalSlot(phoneE164) {
  const raw = String(phoneE164 || "").replace(/\D/g, "");
  if (raw.length < 10) return { ok: false, reason: "invalid_phone" };
  const d = new Date();
  const y = d.getUTCFullYear();
  const wk = Math.ceil((((d - new Date(y, 0, 1)) / 86400000 + new Date(y, 0, 1).getUTCDay() + 1) / 7) || 1);
  const weekKey = `${y}-W${String(wk).padStart(2, "0")}`;
  return withRedis(async (client) => {
    const field = `${raw}:${weekKey}`;
    const n = await client.hincrby(KEY_WA_NT_WEEK, field, 1);
    await client.expire(KEY_WA_NT_WEEK, 60 * 60 * 24 * 30);
    if (n > 2) {
      await client.hincrby(KEY_WA_NT_WEEK, field, -1);
      return { ok: false, reason: "cap" };
    }
    return { ok: true };
  });
}

export async function releaseWhatsAppNonTransactionalSlot(phoneE164) {
  const raw = String(phoneE164 || "").replace(/\D/g, "");
  if (raw.length < 10) return;
  const weekKey = isoWeekKey();
  return withRedis(async (client) => {
    const field = `${raw}:${weekKey}`;
    const n = await client.hget(KEY_WA_NT_WEEK, field);
    if (Number(n) > 0) await client.hincrby(KEY_WA_NT_WEEK, field, -1);
  });
}

export async function wasWeeklySummarySentThisWeek(listingId) {
  const id = String(listingId || "").trim();
  if (!id) return true;
  const wk = isoWeekKey();
  return withRedis(async (client) => {
    const v = await client.hget(KEY_WA_WEEKLY_SENT, id);
    return v === wk;
  });
}

export async function markWeeklySummarySent(listingId) {
  const id = String(listingId || "").trim();
  if (!id) return;
  const wk = isoWeekKey();
  return withRedis(async (client) => {
    await client.hset(KEY_WA_WEEKLY_SENT, id, wk);
    await client.expire(KEY_WA_WEEKLY_SENT, 60 * 60 * 24 * 120);
  });
}

export async function wasOnboarding48hSent(listingId) {
  const id = String(listingId || "").trim();
  if (!id) return true;
  return withRedis(async (client) => {
    const v = await client.get(`${KEY_WA_ONBOARD_48H_SENT}:${id}`);
    return Boolean(v);
  });
}

export async function markOnboarding48hSent(listingId) {
  const id = String(listingId || "").trim();
  if (!id) return;
  return withRedis(async (client) => {
    await client.set(`${KEY_WA_ONBOARD_48H_SENT}:${id}`, "1", "EX", 60 * 60 * 24 * 30);
  });
}

export async function wasInactiveNudgeRecent(listingId) {
  const id = String(listingId || "").trim();
  if (!id) return true;
  return withRedis(async (client) => {
    const t = await client.get(`${KEY_WA_INACTIVE_NUDGE}:${id}`);
    if (!t) return false;
    return Date.now() - Number(t) < 6 * 86400000;
  });
}

export async function markInactiveNudgeSent(listingId) {
  const id = String(listingId || "").trim();
  if (!id) return;
  return withRedis(async (client) => {
    await client.set(`${KEY_WA_INACTIVE_NUDGE}:${id}`, String(Date.now()), "EX", 60 * 60 * 24 * 40);
  });
}

export async function scheduleWaJob(runAtMs, payload) {
  const id = crypto.randomBytes(10).toString("hex");
  await withRedis(async (client) => {
    const body = { ...payload, _id: id, _at: runAtMs };
    await client.set(waJobDataKey(id), JSON.stringify(body), "EX", 60 * 60 * 24 * 10);
    await client.zadd(KEY_WA_JOBS_Z, String(runAtMs), id);
    await client.expire(KEY_WA_JOBS_Z, 60 * 60 * 24 * 14);
  });
  return id;
}

export async function claimDueWaJobs(limit = 24) {
  const now = Date.now();
  return withRedis(async (client) => {
    const ids = await client.zrangebyscore(KEY_WA_JOBS_Z, "0", String(now), "LIMIT", 0, limit);
    const out = [];
    for (const id of ids) {
      const r = await client.zrem(KEY_WA_JOBS_Z, id);
      if (!r) continue;
      const raw = await client.get(waJobDataKey(id));
      await client.del(waJobDataKey(id));
      if (raw) {
        try {
          out.push(JSON.parse(raw));
        } catch {
          /* */
        }
      }
    }
    return out;
  });
}
