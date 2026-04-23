import { getBookingByRef, getMarketplaceListingById, patchBooking, upsertMarketplaceListing, incrementStoreAnalytics, incrementPlatformFunnel } from "../kv-store.js";
import { notifyPushProviderEmail } from "../push.js";
import { siteUrl } from "../site-url.js";

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

function readBody(req, limit = 32 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
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

/** Public POST: guest review for a completed marketplace order (ref + email = proof). */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  }

  let body;
  try {
    const raw = await readBody(req);
    body = JSON.parse(raw);
  } catch {
    return endJson(res, 400, { ok: false, error: "Invalid JSON" });
  }

  const ref = String(body?.ref || "")
    .trim()
    .slice(0, 32);
  const email = normEmail(body?.email || "");
  const rating = Math.min(5, Math.max(1, Math.round(Number(body?.rating) || 0)));
  const text = String(body?.text || "")
    .trim()
    .slice(0, 2000);

  if (!ref || !/^CS-[A-Z0-9]+$/i.test(ref)) {
    return endJson(res, 400, { ok: false, error: "Invalid order reference" });
  }
  if (email.length < 5) {
    return endJson(res, 400, { ok: false, error: "Valid email required" });
  }
  if (rating < 1 || rating > 5) {
    return endJson(res, 400, { ok: false, error: "Rating 1–5 required" });
  }

  try {
    const b = await getBookingByRef(ref);
    if (!b || !b.marketplaceOrder) {
      return endJson(res, 404, { ok: false, error: "Order not found" });
    }
    if (String(b.status) !== "paid") {
      return endJson(res, 400, { ok: false, error: "Order is not complete" });
    }
    if (normEmail(b.email) !== email) {
      return endJson(res, 403, { ok: false, error: "Email does not match this order" });
    }
    if (String(b.storeStage || "new") !== "completed") {
      return endJson(res, 400, { ok: false, error: "Order is not marked complete by the store yet" });
    }
    if (b.customerReviewSubmitted) {
      return endJson(res, 400, { ok: false, error: "You have already left a review for this order" });
    }

    const listingId = String(b.listingId || b.providerId || "").trim();
    if (!listingId) {
      return endJson(res, 500, { ok: false, error: "Store not linked" });
    }

    const listing = await getMarketplaceListingById(listingId);
    if (!listing) {
      return endJson(res, 404, { ok: false, error: "Store not found" });
    }

    const rid = `order-${ref}`;
    const revs = Array.isArray(listing.reviews) ? [...listing.reviews] : [];
    if (revs.some((r) => String(r?.id) === rid)) {
      await patchBooking(ref, { customerReviewSubmitted: true });
      return endJson(res, 200, { ok: true, already: true });
    }

    const now = new Date().toISOString();
    revs.push({
      id: rid,
      rating,
      text,
      date: now.slice(0, 10),
      productName: "Store order",
      customerFirstName: String(b.firstName || "Customer").trim().slice(0, 80) || "Customer",
    });

    await upsertMarketplaceListing({
      id: String(listing.id),
      email: String(listing.email).trim().toLowerCase(),
      role: String(listing.role || "Store").slice(0, 200),
      reviews: revs,
    });

    await patchBooking(ref, {
      customerReviewSubmitted: true,
      customerReviewAt: now,
      customerReviewRating: rating,
    });

    try {
      void incrementStoreAnalytics(String(listingId), "review_submitted");
    } catch {
      /* */
    }
    try {
      void incrementPlatformFunnel("review_submitted");
    } catch {
      /* */
    }

    const pe = String(listing.email || "")
      .trim()
      .toLowerCase();
    if (pe && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pe)) {
      const name = String(listing.role || "Your store").slice(0, 100);
      void notifyPushProviderEmail(pe, {
        title: "New review on your store",
        body: `⭐ A customer left ${rating}/5 for ${name}`,
        url: `${siteUrl()}/store-owner/dashboard`,
      }).catch(() => {});
    }

    return endJson(res, 200, { ok: true });
  } catch (e) {
    console.error("ORDER_REVIEW", e);
    return endJson(res, 500, { ok: false, error: "Server error" });
  }
}
