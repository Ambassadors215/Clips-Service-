import {
  ensureCustomerProfile,
  getCustomerProfile,
  patchCustomerProfile,
  getBookingsByEmail,
  getMarketplaceListingById,
  isListingPubliclyVisible,
} from "../kv-store.js";
import { publicStoreSlug } from "../seo-html.js";
import { getCustomerSessionEmailFromReq } from "../customer-session.js";

function endJson(res, statusCode, obj) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(obj));
}

function readBody(req, limitBytes = 65536) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function parseStoreName(service) {
  const m = String(service || "").match(/Store order:\s*(.+)/i);
  return m ? m[1].trim().slice(0, 120) : "Store";
}

function clampStr(v, max) {
  return String(v == null ? "" : v).trim().slice(0, max);
}

function clampPhone(v) {
  return String(v == null ? "" : v)
    .replace(/[^0-9+\s()-]/g, "")
    .trim()
    .slice(0, 40);
}

function clampPostcode(v) {
  return String(v == null ? "" : v)
    .replace(/[^0-9A-Za-z\s-]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, 12);
}

function digitsPhone(v) {
  return String(v == null ? "" : v).replace(/\D/g, "");
}

function validUkPhoneDigits(phone) {
  const d = digitsPhone(phone);
  return d.length >= 10 && d.length <= 15;
}

/** Normalise to alphanumeric upper (no spaces) for validation. */
function compactUkPostcode(raw) {
  return String(raw == null ? "" : raw)
    .replace(/[^0-9A-Za-z]/g, "")
    .toUpperCase();
}

function validUkPostcodeCompact(raw) {
  const pc = compactUkPostcode(raw);
  return pc.length >= 5 && pc.length <= 8 && /^[A-Z]{1,2}\d[A-Z0-9]?\d[A-Z]{2}$/.test(pc);
}

function buildAddressId() {
  return "a_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const VALID_STAGES = new Set(["new", "confirmed", "preparing", "en_route", "ready", "completed"]);

async function loadOrdersForEmail(email) {
  const bookings = await getBookingsByEmail(email);
  const marketplace = (Array.isArray(bookings) ? bookings : []).filter((b) => b?.marketplaceOrder);
  const orders = [];
  for (const b of marketplace) {
    const ref = String(b.ref || "");
    if (!ref) continue;
    const listingId = String(b.listingId || b.providerId || "");
    let storeName = parseStoreName(b.service);
    let storeSlug = "";
    let storeCity = "";
    let storeWhatsApp = "";
    let storeActive = true;
    if (listingId) {
      try {
        const listing = await getMarketplaceListingById(listingId);
        if (listing) {
          storeName = clampStr(listing.role || storeName, 120);
          if (listing.applicationStatus === "pending") storeActive = false;
          storeSlug = publicStoreSlug(listing);
          storeCity = clampStr(listing.city || "", 80);
          storeWhatsApp = clampStr(listing.whatsappPhone || "", 40);
        }
      } catch {
        // best-effort
      }
    }
    const stage = b.storeStage && String(b.storeStage);
    const storeStage = VALID_STAGES.has(stage) ? stage : "new";
    orders.push({
      ref,
      status: String(b.status || ""),
      storeStage,
      createdAt: String(b.createdAt || ""),
      paidAt: String(b.paidAt || ""),
      totalGBP: b.totalGBP,
      subtotalGBP: b.subtotalGBP,
      deliveryFeeGBP: b.deliveryFeeGBP,
      fulfillment: String(b.fulfillment || "collection"),
      service: String(b.service || "").slice(0, 200),
      storeName,
      storeSlug,
      storeCity,
      storeWhatsApp,
      listingId,
      storeActive,
      firstName: String(b.firstName || "").trim().slice(0, 80),
      customerReviewSubmitted: Boolean(b.customerReviewSubmitted),
      customerReviewRating:
        b.customerReviewRating != null && b.customerReviewRating !== "" ? Number(b.customerReviewRating) : null,
      cartSnapshot: Array.isArray(b.cartSnapshot) ? b.cartSnapshot.slice(0, 60) : [],
    });
  }
  orders.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return orders;
}

async function hydrateSavedStores(savedStoreIds) {
  const ids = Array.isArray(savedStoreIds) ? savedStoreIds.slice(0, 60) : [];
  const out = [];
  for (const id of ids) {
    try {
      const l = await getMarketplaceListingById(String(id));
      if (!l) continue;
      if (!isListingPubliclyVisible(l)) continue;
      out.push({
        id: l.id,
        storeSlug: publicStoreSlug(l),
        role: clampStr(l.role || "", 120),
        bio: clampStr(l.bio || "", 220),
        city: clampStr(l.city || "", 80),
        services: Array.isArray(l.services) ? l.services.slice(0, 4) : [],
        heritageTags: Array.isArray(l.heritageTags) ? l.heritageTags.slice(0, 3) : [],
        coverImageUrl: clampStr(l.coverImageUrl || "", 600),
        pilotBadge: clampStr(l.pilotBadge || "", 120),
        openingHours: clampStr(l.openingHours || "", 280),
      });
    } catch {
      // skip unresolvable ids
    }
  }
  return out;
}

function computeStats(orders) {
  let lifetimeSpend = 0;
  let activeOrders = 0;
  let completedOrders = 0;
  const stores = new Set();
  for (const o of orders) {
    if (o.status === "paid" && Number.isFinite(Number(o.totalGBP))) {
      lifetimeSpend += Number(o.totalGBP) || 0;
    }
    if (o.storeStage === "completed") completedOrders += 1;
    else if (o.status === "paid") activeOrders += 1;
    if (o.listingId) stores.add(o.listingId);
  }
  return {
    totalOrders: orders.length,
    activeOrders,
    completedOrders,
    storesOrderedFrom: stores.size,
    lifetimeSpendGBP: Math.round(lifetimeSpend * 100) / 100,
  };
}

export default async function handler(req, res) {
  const email = getCustomerSessionEmailFromReq(req);
  if (!email) return endJson(res, 401, { ok: false, error: "Not signed in" });

  if (req.method === "GET") {
    const url = new URL(req.url || "/", "http://localhost");
    const action = String(url.searchParams.get("action") || "overview").trim();

    try {
      if (action === "overview") {
        const [profile, orders] = await Promise.all([
          ensureCustomerProfile(email),
          loadOrdersForEmail(email),
        ]);
        const savedStores = await hydrateSavedStores(profile?.savedStoreIds || []);
        return endJson(res, 200, {
          ok: true,
          email,
          profile,
          needsAccountSetup: profile?.accountSetupComplete !== true,
          stats: computeStats(orders),
          orders: orders.slice(0, 6),
          savedStores: savedStores.slice(0, 6),
        });
      }

      if (action === "orders") {
        const orders = await loadOrdersForEmail(email);
        return endJson(res, 200, { ok: true, orders });
      }

      if (action === "saved-stores") {
        const profile = await ensureCustomerProfile(email);
        const savedStores = await hydrateSavedStores(profile?.savedStoreIds || []);
        return endJson(res, 200, { ok: true, savedStores });
      }

      if (action === "profile") {
        const profile = await ensureCustomerProfile(email);
        return endJson(res, 200, {
          ok: true,
          profile,
          needsAccountSetup: profile?.accountSetupComplete !== true,
        });
      }

      return endJson(res, 400, { ok: false, error: "Unknown action" });
    } catch (e) {
      console.error("CUSTOMER_API_GET", e);
      return endJson(res, 500, { ok: false, error: "Server error" });
    }
  }

  if (req.method !== "POST") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    return endJson(res, 400, { ok: false, error: "Invalid JSON" });
  }
  const action = String(payload?.action || "").trim();

  try {
    if (action === "save-store") {
      const id = clampStr(payload?.listingId, 80);
      if (!id) return endJson(res, 400, { ok: false, error: "listingId required" });
      const profile = await ensureCustomerProfile(email);
      const cur = Array.isArray(profile.savedStoreIds) ? profile.savedStoreIds : [];
      const next = cur.filter((x) => x !== id);
      next.unshift(id);
      const updated = await patchCustomerProfile(email, { savedStoreIds: next.slice(0, 60) });
      return endJson(res, 200, { ok: true, savedStoreIds: updated.savedStoreIds });
    }

    if (action === "unsave-store") {
      const id = clampStr(payload?.listingId, 80);
      if (!id) return endJson(res, 400, { ok: false, error: "listingId required" });
      const profile = await ensureCustomerProfile(email);
      const cur = Array.isArray(profile.savedStoreIds) ? profile.savedStoreIds : [];
      const updated = await patchCustomerProfile(email, {
        savedStoreIds: cur.filter((x) => x !== id),
      });
      return endJson(res, 200, { ok: true, savedStoreIds: updated.savedStoreIds });
    }

    if (action === "save-address") {
      const profile = await ensureCustomerProfile(email);
      const existing = Array.isArray(profile.addresses) ? profile.addresses : [];
      const a = payload?.address || {};
      const cleaned = {
        id: clampStr(a.id || "", 40) || buildAddressId(),
        label: clampStr(a.label || "Home", 30),
        line1: clampStr(a.line1, 120),
        line2: clampStr(a.line2, 120),
        city: clampStr(a.city, 60),
        postcode: clampPostcode(a.postcode),
      };
      if (!cleaned.line1 || !cleaned.postcode) {
        return endJson(res, 400, { ok: false, error: "Address line 1 and postcode required" });
      }
      const filtered = existing.filter((x) => x && x.id !== cleaned.id);
      filtered.unshift(cleaned);
      const updated = await patchCustomerProfile(email, { addresses: filtered.slice(0, 8) });
      return endJson(res, 200, { ok: true, addresses: updated.addresses });
    }

    if (action === "delete-address") {
      const id = clampStr(payload?.id, 40);
      if (!id) return endJson(res, 400, { ok: false, error: "id required" });
      const profile = await ensureCustomerProfile(email);
      const cur = Array.isArray(profile.addresses) ? profile.addresses : [];
      const updated = await patchCustomerProfile(email, {
        addresses: cur.filter((x) => x && x.id !== id),
      });
      return endJson(res, 200, { ok: true, addresses: updated.addresses });
    }

    if (action === "update-profile") {
      const p = payload?.profile || {};
      const patch = {
        firstName: clampStr(p.firstName, 60),
        lastName: clampStr(p.lastName, 60),
        phone: clampPhone(p.phone),
        whatsappOptIn: !!p.whatsappOptIn,
        marketingOptIn: !!p.marketingOptIn,
        preferredArea: clampStr(p.preferredArea, 60),
        preferredPostcode: clampPostcode(p.preferredPostcode),
      };
      const updated = await patchCustomerProfile(email, patch);
      return endJson(res, 200, { ok: true, profile: updated });
    }

    if (action === "complete-account-setup") {
      if (payload?.termsAccepted !== true) {
        return endJson(res, 400, { ok: false, error: "Please accept the Terms and Privacy policy to continue." });
      }
      const firstName = clampStr(payload.firstName, 60);
      const lastName = clampStr(payload.lastName, 60);
      const phone = clampPhone(payload.phone);
      const preferredArea = clampStr(payload.preferredArea, 60);
      const preferredPostcode = clampPostcode(payload.preferredPostcode);
      if (!firstName) return endJson(res, 400, { ok: false, error: "First name is required." });
      if (!lastName) return endJson(res, 400, { ok: false, error: "Last name is required." });
      if (!validUkPhoneDigits(phone)) {
        return endJson(res, 400, { ok: false, error: "Enter a valid UK phone number (at least 10 digits)." });
      }
      if (!preferredArea) {
        return endJson(res, 400, { ok: false, error: "Choose your preferred Manchester area." });
      }
      if (!validUkPostcodeCompact(preferredPostcode)) {
        return endJson(res, 400, { ok: false, error: "Enter a valid UK postcode (e.g. M13 0LN)." });
      }
      const nowIso = new Date().toISOString();
      const updated = await patchCustomerProfile(email, {
        firstName,
        lastName,
        phone,
        preferredArea,
        preferredPostcode,
        whatsappOptIn: !!payload.whatsappOptIn,
        marketingOptIn: !!payload.marketingOptIn,
        accountSetupComplete: true,
        termsAcceptedAt: nowIso,
      });
      if (!updated) return endJson(res, 503, { ok: false, error: "Account storage is unavailable. Try again later." });
      return endJson(res, 200, { ok: true, profile: updated, needsAccountSetup: false });
    }

    return endJson(res, 400, { ok: false, error: "Unknown action" });
  } catch (e) {
    console.error("CUSTOMER_API_POST", e);
    return endJson(res, 500, { ok: false, error: "Server error" });
  }
}
