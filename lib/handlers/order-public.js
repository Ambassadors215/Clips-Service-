import { getBookingByRef, getMarketplaceListingById, authRateConsume, isKvRedisConfigured } from "../kv-store.js";
import { publicStoreSlug } from "../seo-html.js";
import {
  contactsMatchBooking,
  isValidMarketplaceOrderRef,
  normalizeOrderEmail,
  trackingMagicLink,
} from "../order-utils.js";

function endJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(obj));
}

function clientIp(req) {
  const xff = req.headers?.["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) return xff.split(",")[0].trim().slice(0, 64).replace(/^::ffff:/, "");
  return String(req.socket?.remoteAddress || "")
    .replace(/^::ffff:/, "")
    .slice(0, 64);
}

async function maybeOrderPublicRateLimit(ip) {
  if (!isKvRedisConfigured()) return false;
  const over = await authRateConsume(ip, "order_public_lookup", 48, 900);
  return over === true;
}

function parseStoreName(service) {
  const m = String(service || "").match(/Store order:\s*(.+)/i);
  return m ? m[1].trim().slice(0, 120) : "Store";
}

function coerceHistory(booking, listing) {
  const raw = Array.isArray(booking?.orderStageHistory) ? booking.orderStageHistory : [];
  const valid = new Set(["new", "confirmed", "preparing", "en_route", "ready", "completed"]);
  const rows = raw
    .filter((h) => h && valid.has(String(h.status || "")))
    .map((h) => ({
      status: String(h.status),
      at: String(h.at || booking?.paidAt || booking?.createdAt || ""),
      note: String(h.note || "").slice(0, 280),
    }));
  if (rows.length) return rows;
  const st = String(booking?.storeStage || "new");
  const at = String(booking?.paidAt || booking?.createdAt || "");
  return [{ status: valid.has(st) ? st : "new", at, note: "" }];
}

function resolveEtaMinutes(booking, listing) {
  const prep = Number(listing?.prepEtaMinutes);
  const prepM = Number.isFinite(prep) && prep > 0 ? Math.min(240, Math.round(prep)) : 25;
  const del = Number(listing?.deliveryEtaMinutes);
  const delM = Number.isFinite(del) && del > 0 ? Math.min(180, Math.round(del)) : 45;
  const isDel = String(booking?.fulfillment || "") === "delivery";
  return {
    prepMinutes: prepM,
    deliveryEstimateMinutes: delM,
    collectionReadyHintMinutes: prepM + 10,
    mode: isDel ? "delivery" : "collection",
  };
}

function buildOrderPayload(booking, listingMeta) {
  const cartSnapshot = Array.isArray(booking.cartSnapshot) ? booking.cartSnapshot : [];
  const eta = resolveEtaMinutes(booking, listingMeta?.listing || null);
  const history = coerceHistory(booking, listingMeta?.listing || null);

  return {
    ref: String(booking.ref),
    firstName: String(booking.firstName || ""),
    lastName: String(booking.lastName || ""),
    email: String(booking.email || "").replace(/(.{2}).*(@.*)/, "$1***$2"),
    phone: String(booking.phone || "").replace(/(\d{3})\d+(\d{2})$/, "$1***$2"),
    service: String(booking.service || ""),
    subtotalGBP: booking.subtotalGBP,
    deliveryFeeGBP: booking.deliveryFeeGBP,
    platformFeeGBP: booking.platformFeeGBP,
    totalGBP: booking.totalGBP,
    fulfillment: String(booking.fulfillment || "collection"),
    deliveryAddress:
      booking.deliveryAddress && typeof booking.deliveryAddress === "object" ? booking.deliveryAddress : null,
    cartSnapshot: cartSnapshot.map((l) => ({
      item: String(l?.item || ""),
      qty: Number(l?.qty) || 0,
      price: String(l?.price || ""),
      idx: l?.idx != null ? Number(l.idx) : undefined,
    })),
    paidAt: String(booking.paidAt || ""),
    listingId: String(booking.listingId || booking.providerId || ""),
    storeWhatsApp: listingMeta.storeWhatsApp || "",
    storeName: listingMeta.storeName || "",
    storeCity: listingMeta.storeCity || "",
    storeAddressLine: listingMeta.storeAddressLine || "",
    storeSlug: listingMeta.storeSlug || "",
    storeStage: String(booking.storeStage || "new"),
    orderStageHistory: history,
    estimatedPrepMinutes: eta.prepMinutes,
    estimatedDeliveryMinutes: eta.deliveryEstimateMinutes,
    estimatedCollectionMinutes: eta.collectionReadyHintMinutes,
    trackingHref: listingMeta.trackingHref || "",
  };
}

async function hydrateListing(booking, trackingHref) {
  let storeWhatsApp = "";
  let storeName = parseStoreName(booking.service);
  let storeCity = "";
  let storeAddressLine = "";
  let listing = null;
  let storeSlug = "";
  const lid = String(booking.listingId || booking.providerId || "").trim();
  if (lid) {
    try {
      listing = await getMarketplaceListingById(lid);
      if (listing) {
        storeWhatsApp = String(listing.whatsappPhone || "").trim();
        storeName = String(listing.role || storeName).trim().slice(0, 120);
        storeCity = String(listing.city || "").trim();
        const ln1 = String(listing.addressLine1 || listing.line1 || "").trim();
        const pc = String(listing.postcode || "").trim();
        storeAddressLine = [ln1, storeCity, pc].filter(Boolean).join(", ").slice(0, 220);
        storeSlug = publicStoreSlug(listing);
      }
    } catch {
      /* ignore */
    }
  }
  return { listing, storeWhatsApp, storeName, storeCity, storeAddressLine, storeSlug, trackingHref };
}

/**
 * Paid marketplace order lookup.
 * Requires ref AND (matching email OR phone OR valid tracking token t).
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  }

  const ip = clientIp(req);
  if (await maybeOrderPublicRateLimit(ip)) {
    return endJson(res, 429, { ok: false, error: "Too many lookups. Try again in a few minutes." });
  }

  const url = new URL(req.url || "/", "http://localhost");
  const refRaw = String(url.searchParams.get("ref") || "")
    .trim()
    .slice(0, 36);
  const ref = refRaw.toUpperCase();
  const emailQ = normalizeOrderEmail(url.searchParams.get("email") || "");
  const phoneQ = String(url.searchParams.get("phone") || "").trim();
  const track = String(url.searchParams.get("t") || url.searchParams.get("track") || "").trim();

  if (!ref || !isValidMarketplaceOrderRef(ref)) {
    return endJson(res, 400, { ok: false, error: "Invalid Order ID format." });
  }

  try {
    const booking = await getBookingByRef(ref);
    if (!booking || !booking.marketplaceOrder || String(booking.status) !== "paid") {
      return endJson(res, 404, { ok: false, error: "We couldn’t find that order." });
    }

    const tokenOk =
      track.length >= 16 && String(booking.trackingToken || "").length >= 16 && track === booking.trackingToken;

    let contactOk = false;
    if (emailQ && /\S+@\S+\.\S+/.test(emailQ)) {
      contactOk = contactsMatchBooking(booking, emailQ, "");
    }
    if (!contactOk && (phoneQ.length >= 10 || /\d/.test(phoneQ))) {
      contactOk = contactsMatchBooking(booking, "", phoneQ);
    }

    if (!tokenOk && !contactOk) {
      return endJson(res, 403, {
        ok: false,
        code: "verify_contact",
        error: "Enter the email or UK mobile number from your order so we can show this securely.",
      });
    }

    const trackingHref = trackingMagicLink(booking);
    const meta = await hydrateListing(booking, trackingHref);

    return endJson(res, 200, {
      ok: true,
      order: buildOrderPayload(booking, meta),
    });
  } catch (e) {
    console.error("ORDER_PUBLIC", e);
    return endJson(res, 500, { ok: false, error: "Something went wrong. Try again shortly." });
  }
}
