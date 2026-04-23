import { getBookingsByEmail, getMarketplaceListingById } from "../kv-store.js";
import { publicStoreSlug } from "../seo-html.js";

function endJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(obj));
}

function normEmail(s) {
  return String(s || "")
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "")
    .trim()
    .toLowerCase();
}

function isValidEmail(email) {
  const e = normEmail(email);
  return e.length > 3 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function parseStoreName(service) {
  const m = String(service || "").match(/Store order:\s*(.+)/i);
  return m ? m[1].trim().slice(0, 120) : "Store";
}

/** Customer order list for /customer/orders (guest, email in query — same pattern as dashboard). */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  }

  const url = new URL(req.url || "/", "http://localhost");
  const email = normEmail(url.searchParams.get("email") || "");
  if (!isValidEmail(email)) {
    return endJson(res, 400, { ok: false, error: "Valid email required" });
  }

  try {
    const bookings = await getBookingsByEmail(email);
    const marketplace = (Array.isArray(bookings) ? bookings : []).filter((b) => b?.marketplaceOrder);
    const orders = [];

    for (const b of marketplace) {
      const ref = String(b.ref || "");
      if (!ref) continue;
      const listingId = String(b.listingId || b.providerId || "");
      let storeActive = true;
      let storeName = parseStoreName(b.service);
      let storeSlug = "";
      let storeWhatsApp = "";
      let storeCity = "";
      if (listingId) {
        try {
          const listing = await getMarketplaceListingById(listingId);
          if (listing) {
            storeName = String(listing.role || storeName).slice(0, 120);
            if (listing.applicationStatus === "pending") storeActive = false;
            storeSlug = publicStoreSlug(listing);
            storeWhatsApp = String(listing.whatsappPhone || "").trim();
            storeCity = String(listing.city || "").trim();
          }
        } catch {
          /* ignore */
        }
      }
      const stage = b.storeStage && String(b.storeStage);
      const validStages = new Set(["new", "confirmed", "preparing", "en_route", "ready", "completed"]);
      const storeStage = validStages.has(stage) ? stage : "new";

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
        storeWhatsApp,
        storeCity,
        listingId,
        storeActive,
        firstName: String(b.firstName || "").trim().slice(0, 80),
        customerReviewSubmitted: Boolean(b.customerReviewSubmitted),
        customerReviewRating:
          b.customerReviewRating != null && b.customerReviewRating !== "" ? Number(b.customerReviewRating) : null,
        cartSnapshot: Array.isArray(b.cartSnapshot) ? b.cartSnapshot : [],
      });
    }

    orders.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    return endJson(res, 200, { ok: true, orders });
  } catch (e) {
    console.error("CUSTOMER_ORDERS", e);
    return endJson(res, 500, { ok: false, error: "Server error" });
  }
}
