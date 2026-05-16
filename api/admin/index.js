import { endJson, readBody, requireAdmin } from "./_utils.js";
import {
  getBookings,
  getContacts,
  getProviders,
  getBookingByRef,
  updateBookingStatus,
  getNegotiations,
  getMarketplaceListings,
  upsertMarketplaceListing,
  removeMarketplaceListing,
  getRecentSiteVisits,
  getOnboardingAnalyticsCounters,
  getOnboardingApplications,
  getSearchAnalyticsSummary,
  getPwaMetrics,
  getWhatsAppMetrics,
  getMarketplaceListingById,
  getPlatformFunnel,
  getCustomerCount,
} from "../../lib/kv-store.js";
import { notifyBookingStatusCustomer } from "../../lib/notify.js";
import { waNotifyStoreApproved } from "../../lib/whatsapp-notify.js";
import { sendEmail, isEmailConfigured } from "../../lib/email.js";
import { siteUrl } from "../../lib/site-url.js";
import { publicStoreSlug } from "../../lib/seo-html.js";

function escEmailHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function notifyApprovedMerchantEmail(listing) {
  const to = String(listing?.email || "").trim();
  if (!to || !isEmailConfigured()) return;
  const base = siteUrl().replace(/\/$/, "");
  const slug = publicStoreSlug(listing);
  const storeUrl = `${base}/stores/${encodeURIComponent(slug)}`;
  const dashUrl = `${base}/store-owner/dashboard`;
  const name = escEmailHtml(listing.ownerName || listing.role || "there");
  const store = escEmailHtml(listing.role || "Your store");
  const html = `<p>Hi ${name},</p>
<p>Good news — <strong>${store}</strong> is approved on Clip Services. Your storefront is live for customers.</p>
<p><a href="${escEmailHtml(storeUrl)}">Open your store page</a></p>
<p>Sign in to add products and manage orders: <a href="${escEmailHtml(dashUrl)}">${escEmailHtml(dashUrl)}</a> (use the same email you applied with).</p>
<p>Thanks for listing with Clip Services.</p>`;
  return sendEmail({
    to,
    subject: `Approved — ${String(listing.role || "your store").slice(0, 80)} is live on Clip Services`,
    html,
  });
}

function notifyRejectedMerchantEmail(listing) {
  const to = String(listing?.email || "").trim();
  if (!to || !isEmailConfigured()) return;
  const store = escEmailHtml(listing.role || "Your application");
  const html = `<p>Hi ${escEmailHtml(listing.ownerName || "there")},</p>
<p>Thank you for applying to Clip Services. We're unable to onboard <strong>${store}</strong> at this time.</p>
<p>If you have questions, reply to this email.</p>`;
  return sendEmail({
    to,
    subject: "Update on your Clip Services store application",
    html,
  });
}

async function handlePing(req, res) {
  return endJson(res, 200, { ok: true });
}

async function handleBookings(req, res) {
  if (req.method !== "GET") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  try {
    const items = await getBookings();
    return endJson(res, 200, { ok: true, items });
  } catch (e) {
    console.error("ADMIN_BOOKINGS_ERROR", e);
    return endJson(res, 500, { ok: false, error: "Failed to load bookings" });
  }
}

async function handleContacts(req, res) {
  if (req.method !== "GET") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  try {
    const items = await getContacts();
    // Compute lightweight buckets so the admin UI can filter without re-parsing.
    let waitlist = 0;
    let newsletter = 0;
    let messages = 0;
    for (const it of items || []) {
      const t = String(it?.applicationType || "").toLowerCase();
      if (t === "city-waitlist") waitlist += 1;
      else if (t === "newsletter") newsletter += 1;
      else messages += 1;
    }
    return endJson(res, 200, {
      ok: true,
      items,
      buckets: { waitlist, newsletter, messages, total: (items || []).length },
    });
  } catch (e) {
    console.error("ADMIN_CONTACTS_ERROR", e);
    return endJson(res, 500, { ok: false, error: "Failed to load contacts" });
  }
}

async function handleCustomerSummary(req, res) {
  if (req.method !== "GET") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  try {
    const [count, bookings] = await Promise.all([
      getCustomerCount().catch(() => 0),
      getBookings().catch(() => []),
    ]);
    const marketplace = (bookings || []).filter((b) => b?.marketplaceOrder);
    const paid = marketplace.filter((b) => b?.status === "paid");
    const totalPaidSpendGBP = paid.reduce((acc, b) => acc + (Number(b.totalGBP) || 0), 0);
    const uniquePayingEmails = new Set();
    for (const b of paid) {
      const e = String(b.email || "").toLowerCase();
      if (e) uniquePayingEmails.add(e);
    }
    return endJson(res, 200, {
      ok: true,
      summary: {
        customersRegistered: count,
        marketplaceOrders: marketplace.length,
        marketplaceOrdersPaid: paid.length,
        uniquePayingCustomers: uniquePayingEmails.size,
        marketplaceRevenueGBP: Math.round(totalPaidSpendGBP * 100) / 100,
      },
    });
  } catch (e) {
    console.error("ADMIN_CUSTOMER_SUMMARY", e);
    return endJson(res, 500, { ok: false, error: "Failed to load customer summary" });
  }
}

async function handleProviders(req, res) {
  if (req.method !== "GET") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  try {
    const providers = await getProviders();
    return endJson(res, 200, { ok: true, providers });
  } catch (e) {
    console.error("ADMIN_PROVIDERS_ERROR", e);
    return endJson(res, 500, { ok: false, error: "Failed to load providers" });
  }
}

async function handleUpdateBooking(req, res) {
  if (req.method !== "POST") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    return endJson(res, 400, { ok: false, error: "Invalid JSON" });
  }
  const ref = String(payload?.ref || "").trim();
  const status = String(payload?.status || "").trim();
  const allowed = new Set(["new", "awaiting_payment", "paid", "confirmed", "completed", "cancelled"]);
  if (!ref) return endJson(res, 400, { ok: false, error: "Missing ref" });
  if (!allowed.has(status)) return endJson(res, 400, { ok: false, error: "Invalid status" });
  try {
    const before = await getBookingByRef(ref);
    const updated = await updateBookingStatus(ref, status);
    if (!updated) return endJson(res, 404, { ok: false, error: "Booking not found" });
    const notifyCustomer =
      before &&
      before.status !== status &&
      ["confirmed", "completed", "cancelled", "paid"].includes(status);
    if (notifyCustomer) {
      const booking = await getBookingByRef(ref);
      if (booking) void notifyBookingStatusCustomer(booking, status).catch((e) => console.error("NOTIFY_STATUS", e));
    }
    return endJson(res, 200, { ok: true });
  } catch (e) {
    console.error("ADMIN_UPDATE_BOOKING_ERROR", e);
    return endJson(res, 500, { ok: false, error: "Failed to update" });
  }
}

async function handleNegotiations(req, res) {
  if (req.method !== "GET") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  try {
    const items = await getNegotiations();
    return endJson(res, 200, { ok: true, items });
  } catch (e) {
    console.error("ADMIN_NEGOTIATIONS_ERROR", e);
    return endJson(res, 500, { ok: false, error: "Failed to load negotiations" });
  }
}

async function handleMarketplace(req, res) {
  if (req.method !== "GET") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  try {
    const items = await getMarketplaceListings();
    return endJson(res, 200, { ok: true, items });
  } catch (e) {
    console.error("ADMIN_MARKETPLACE_ERROR", e);
    return endJson(res, 500, { ok: false, error: "Failed to load marketplace listings" });
  }
}

async function handleMarketplacePublish(req, res) {
  if (req.method !== "POST") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    return endJson(res, 400, { ok: false, error: "Invalid JSON" });
  }
  const id = String(payload?.id || "").trim().slice(0, 96);
  const email = String(payload?.email || "").trim().slice(0, 120);
  const role = String(payload?.role || "").trim().slice(0, 200);
  const bio = String(payload?.bio || "").trim().slice(0, 4000);
  const category = String(payload?.category || "runner").trim().slice(0, 40);
  const icon = String(payload?.icon || "plus").trim().slice(0, 40);
  const popular = Boolean(payload?.popular);
  const negotiationEnabled = payload?.negotiationEnabled !== false;
  const applicationStatus = String(payload?.applicationStatus || "").trim().toLowerCase();
  let services = payload?.services;
  if (typeof services === "string") {
    services = services.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
  }
  if (!Array.isArray(services)) services = [];
  if (!id || !email || !role) {
    return endJson(res, 400, { ok: false, error: "id, email, and display name (role) are required" });
  }
  try {
    const prev = await getMarketplaceListingById(id);
    const up = { id, email, role, bio, services, category, icon, popular, negotiationEnabled };
    if (applicationStatus && ["pending", "approved", "active", "rejected"].includes(applicationStatus)) {
      up.applicationStatus = applicationStatus;
    }
    await upsertMarketplaceListing(up);
    if (
      prev &&
      String(prev.applicationStatus) === "pending" &&
      (applicationStatus === "approved" || applicationStatus === "active")
    ) {
      const next = await getMarketplaceListingById(id);
      if (next) {
        void waNotifyStoreApproved(next).catch((e) => console.error("WA_APPROVED", e));
        void notifyApprovedMerchantEmail(next).catch((e) => console.error("EMAIL_APPROVED", e));
      }
    }
    return endJson(res, 200, { ok: true });
  } catch (e) {
    console.error("ADMIN_MARKETPLACE_PUBLISH", e);
    return endJson(res, 400, { ok: false, error: e.message || "Publish failed" });
  }
}

async function handlePlatformStats(req, res) {
  if (req.method !== "GET") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  try {
    const listings = await getMarketplaceListings();
    const bookings = await getBookings();
    const counters = await getOnboardingAnalyticsCounters();
    const apps = await getOnboardingApplications();
    const marketplaceOrders = bookings.filter((b) => b.marketplaceOrder);
    const gmv = marketplaceOrders.reduce((s, b) => s + Number(b.subtotalGBP || b.totalGBP || 0), 0);
    const approvedStores = listings.filter((x) => x?.applicationStatus === "approved").length;
    const activatedStores = listings.filter((x) => {
      if (x?.applicationStatus === "pending") return false;
      const pl = Array.isArray(x?.priceList) ? x.priceList.length : 0;
      const sp = Array.isArray(x?.storeProducts) ? x.storeProducts.length : 0;
      return pl + sp > 0;
    }).length;
    const subTotal = (counters.submissionsStore || 0) + (counters.submissionsStall || 0);
    const applicationToActivePct = subTotal ? ((activatedStores / subTotal) * 100).toFixed(2) : null;
    let pwa = null;
    try {
      pwa = await getPwaMetrics();
    } catch {
      pwa = null;
    }
    let wa = null;
    try {
      wa = await getWhatsAppMetrics();
    } catch {
      wa = null;
    }
    let funnel = null;
    try {
      funnel = await getPlatformFunnel();
    } catch {
      funnel = null;
    }
    const reviewCompletionRatePct =
      funnel && funnel.order_complete > 0
        ? Math.round((1000 * (funnel.review_submitted || 0)) / funnel.order_complete) / 10
        : null;
    return endJson(res, 200, {
      ok: true,
      totalApplicationsLogged: apps.length,
      onboardingSubmissionsTotal: subTotal,
      approvedStores,
      activatedStoresWithProducts: activatedStores,
      totalMarketplaceOrders: marketplaceOrders.length,
      totalGmvGbp: Math.round(gmv * 100) / 100,
      applicationToActivePct,
      pwa,
      whatsapp: wa,
      reviewCompletionRatePct,
    });
  } catch (e) {
    console.error("ADMIN_PLATFORM", e);
    return endJson(res, 500, { ok: false, error: "Failed to load platform stats" });
  }
}

async function handleOnboardingStats(req, res) {
  if (req.method !== "GET") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  try {
    const counters = await getOnboardingAnalyticsCounters();
    const applications = await getOnboardingApplications();
    const listings = await getMarketplaceListings();
    const pending = listings.filter((x) => x?.applicationStatus === "pending").length;
    const live = listings.filter((x) => x?.applicationStatus && x.applicationStatus !== "pending").length;
    const legacy = listings.filter((x) => !x?.applicationStatus).length;
    const approvedCount = listings.filter((x) => x?.applicationStatus === "approved").length;
    const activatedCount = listings.filter((x) => x?.applicationStatus === "active").length;
    const vs = counters.viewsStoreApply || 0;
    const ss = counters.submissionsStore || 0;
    const st = counters.submissionsStall || 0;
    const subTotal = ss + st;
    const approvedPipeline = approvedCount + activatedCount;
    return endJson(res, 200, {
      ok: true,
      counters,
      listingCounts: {
        total: listings.length,
        pendingDrafts: pending,
        publishedOrLegacy: live + legacy,
        approvedCount,
        activatedCount,
        approvedOrActive: approvedPipeline,
      },
      conversion: {
        storeViewsToSubmit: vs ? ((ss / vs) * 100).toFixed(2) : null,
        submitToApprovedPipeline: subTotal ? ((approvedPipeline / subTotal) * 100).toFixed(2) : null,
      },
      recentApplications: applications.slice(0, 40),
    });
  } catch (e) {
    console.error("ADMIN_ONBOARDING", e);
    return endJson(res, 500, { ok: false, error: "Failed to load onboarding stats" });
  }
}

async function handleSiteVisits(req, res) {
  if (req.method !== "GET") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  try {
    const items = await getRecentSiteVisits(500);
    return endJson(res, 200, { ok: true, items });
  } catch (e) {
    console.error("ADMIN_SITE_VISITS", e);
    return endJson(res, 500, { ok: false, error: "Failed to load visits" });
  }
}

async function handleSearchAnalytics(req, res) {
  if (req.method !== "GET") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  try {
    const summary = await getSearchAnalyticsSummary();
    return endJson(res, 200, { ok: true, ...summary });
  } catch (e) {
    console.error("ADMIN_SEARCH_ANALYTICS", e);
    return endJson(res, 500, { ok: false, error: "Failed to load search analytics" });
  }
}

/** Approve or reject an existing onboarding listing by id (no manual re-enter of fields). */
async function handleListingApplicationReview(req, res) {
  if (req.method !== "POST") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    return endJson(res, 400, { ok: false, error: "Invalid JSON" });
  }
  const id = String(payload?.id || "").trim();
  const decision = String(payload?.decision || "").trim().toLowerCase();
  if (!id) return endJson(res, 400, { ok: false, error: "Missing id" });
  if (!["approve", "reject"].includes(decision)) {
    return endJson(res, 400, { ok: false, error: 'decision must be "approve" or "reject"' });
  }
  try {
    const prev = await getMarketplaceListingById(id);
    if (!prev) return endJson(res, 404, { ok: false, error: "Listing not found" });
    const wasPending = String(prev.applicationStatus || "").toLowerCase() === "pending";

    if (decision === "approve") {
      await upsertMarketplaceListing({
        id,
        applicationStatus: "approved",
      });
      const next = await getMarketplaceListingById(id);
      if (wasPending && next) {
        void waNotifyStoreApproved(next).catch((e) => console.error("WA_APPROVED", e));
        void notifyApprovedMerchantEmail(next).catch((e) => console.error("EMAIL_APPROVED", e));
      }
    } else {
      await upsertMarketplaceListing({
        id,
        applicationStatus: "rejected",
      });
      if (wasPending) {
        void notifyRejectedMerchantEmail(prev).catch((e) => console.error("EMAIL_REJECTED", e));
      }
    }
    return endJson(res, 200, {
      ok: true,
      applicationStatus: decision === "approve" ? "approved" : "rejected",
      listedOnWebsite: decision === "approve",
    });
  } catch (e) {
    console.error("ADMIN_LISTING_REVIEW", e);
    return endJson(res, 500, { ok: false, error: e.message || "Review failed" });
  }
}

async function handleMarketplaceUnpublish(req, res) {
  if (req.method !== "POST") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    return endJson(res, 400, { ok: false, error: "Invalid JSON" });
  }
  const id = String(payload?.id || "").trim();
  if (!id) return endJson(res, 400, { ok: false, error: "Missing id" });
  try {
    const ok = await removeMarketplaceListing(id);
    if (!ok) return endJson(res, 404, { ok: false, error: "Listing not found" });
    return endJson(res, 200, { ok: true });
  } catch (e) {
    console.error("ADMIN_MARKETPLACE_UNPUBLISH", e);
    return endJson(res, 500, { ok: false, error: "Unpublish failed" });
  }
}

const ROUTES = {
  ping: handlePing,
  bookings: handleBookings,
  negotiations: handleNegotiations,
  marketplace: handleMarketplace,
  "marketplace-publish": handleMarketplacePublish,
  "marketplace-unpublish": handleMarketplaceUnpublish,
  "listing-application-review": handleListingApplicationReview,
  contacts: handleContacts,
  "customer-summary": handleCustomerSummary,
  providers: handleProviders,
  "update-booking": handleUpdateBooking,
  "site-visits": handleSiteVisits,
  "onboarding-stats": handleOnboardingStats,
  "platform-stats": handlePlatformStats,
  "search-analytics": handleSearchAnalytics,
};

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  const url = new URL(req.url, `http://${req.headers.host}`);
  const action = url.searchParams.get("action") || "";

  const routeHandler = ROUTES[action];
  if (!routeHandler) {
    return endJson(res, 400, { ok: false, error: `Unknown action: ${action}` });
  }
  return routeHandler(req, res);
}
