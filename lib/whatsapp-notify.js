/**
 * WhatsApp copy + orchestration (customer, store owner, onboarding, jobs).
 * Uses Meta Cloud API when configured; otherwise no-ops (email/push still apply).
 */
import {
  tryWhatsAppNonTransactionalSlot,
  releaseWhatsAppNonTransactionalSlot,
  scheduleWaJob,
  getBookingByRef,
  getMarketplaceListingById,
  getBookings,
  getMarketplaceListings,
  getListingLastOrderMap,
  wasWeeklySummarySentThisWeek,
  markWeeklySummarySent,
  wasOnboarding48hSent,
  markOnboarding48hSent,
  wasInactiveNudgeRecent,
  markInactiveNudgeSent,
  claimDueWaJobs,
} from "./kv-store.js";
import { sendWhatsAppText, toWhatsAppDigits, isWhatsAppApiConfigured } from "./whatsapp-send.js";
import { siteUrl } from "./site-url.js";
import { publicStoreSlug } from "./seo-html.js";

const DASH = () => `${siteUrl()}/store-owner/dashboard?src=wa`;
const ORDERS = (email) =>
  `${siteUrl()}/customer/orders/?email=${encodeURIComponent(String(email || "").trim())}&src=wa`;

function firstName(booking) {
  return String(booking?.firstName || "there")
    .trim()
    .split(/\s+/)[0] || "there";
}

function storeName(listing) {
  return String(listing?.role || "Your store")
    .trim()
    .slice(0, 80) || "Your store";
}

function storeAddressLine(listing) {
  const c = String(listing?.city || "").trim();
  const pc = String(listing?.postcode || "").trim();
  if (c && pc) return `${c} · ${pc}`;
  if (c) return c;
  if (pc) return pc;
  return "See your collection details in your order link.";
}

function formatOrderLines(cart) {
  if (!Array.isArray(cart) || !cart.length) return "—";
  return cart
    .slice(0, 12)
    .map((l) => {
      const p = l?.price;
      return `• ${l?.item || "Item"} ×${l?.qty || 1} — ${p || ""}`.trim();
    })
    .join("\n");
}

function withWaLinks(url) {
  const s = String(url);
  if (s.includes("src=wa")) return s;
  return s.includes("?") ? `${s}&src=wa` : `${s}?src=wa`;
}

function reviewUrlFor(booking) {
  const e = String(booking?.email || "").trim();
  return withWaLinks(
    `${siteUrl()}/customer/review/?ref=${encodeURIComponent(booking.ref)}&email=${encodeURIComponent(e)}`
  );
}

/* ── transactional (ignore weekly cap) ── */

export async function waNotifyCustomerOrderPlaced(listing, booking) {
  if (!isWhatsAppApiConfigured()) return;
  const to = toWhatsAppDigits(booking?.phone);
  if (!to) return;
  const name = firstName(booking);
  const sn = storeName(listing);
  const text = `Hi ${name} 👋
Your order #${booking.ref} from ${sn} has been received 🎉
We’ll let you know when it’s ready.
Track: ${ORDERS(booking.email)}`;
  await sendWhatsAppText(to, text, { type: "order_placed_customer" });
}

export async function waNotifyStoreNewOrder(listing, booking) {
  if (!isWhatsAppApiConfigured()) return;
  const prefs = listing?.notificationPrefs || {};
  if (prefs.orderWhatsApp === false) return;
  const to = toWhatsAppDigits(listing?.whatsappPhone);
  if (!to) return;
  const sub = Number(booking.subtotalGBP ?? booking.totalGBP ?? 0);
  const fulfil = String(booking.fulfillment) === "delivery" ? "Delivery" : "Collection";
  const addr =
    String(booking.fulfillment) === "delivery" && booking.deliveryAddress
      ? `\nAddress: ${String(booking.deliveryAddress?.line1 || "")}, ${String(
          booking.deliveryAddress?.city || ""
        )} ${String(booking.deliveryAddress?.postcode || "")}`
      : "";
  const text = `🛒 NEW ORDER — Clip Services
#${booking.ref}
${formatOrderLines(booking.cartSnapshot)}

Total: £${sub.toFixed(2)}
Fulfilment: ${fulfil}${addr}
Customer: ${String(booking.firstName || "")} ${String(booking.lastName || "")}
WhatsApp: ${String(booking.phone || "").replace(/\D/g, "")}
👉 ${DASH()}`;
  await sendWhatsAppText(to, text, { type: "new_order_store" });
}

export async function waNotifyStoreOwnerApplicationWelcome(listing) {
  if (!isWhatsAppApiConfigured()) return;
  const to = toWhatsAppDigits(listing?.whatsappPhone);
  if (!to) return;
  const text = `Welcome to Clip Services 🎉
1. Application received ✅
2. We’ll review within 48 hours ⏳
3. Prep 5+ product photos 📸
4. Write your store description 📝
5. Connect your bank in the dashboard 💳
Questions? Reply here 👍`;
  await sendWhatsAppText(to, text, { type: "onboard_welcome" });
}

/* ── stage changes ── */

export async function waNotifyCustomerOrderStage(listing, booking, stage) {
  if (!isWhatsAppApiConfigured()) return;
  const to = toWhatsAppDigits(booking?.phone);
  if (!to) return;
  const sn = storeName(listing);
  const isDel = String(booking.fulfillment) === "delivery";
  if (stage === "ready" && isDel) {
    const text = `Your order from ${sn} is packed and heading out soon 🚗
#${booking.ref}
Track: ${ORDERS(booking.email)}`;
    await sendWhatsAppText(to, text, { type: "order_ready_delivery" });
    return;
  }
  if (stage === "ready" && !isDel) {
    const text = `✅ ${sn} — your order is ready for collection! 📍 ${storeAddressLine(
      listing
    )}
#${booking.ref}
See you soon 🙌🏾`;
    await sendWhatsAppText(to, text, { type: "order_ready_collection" });
    return;
  }
  if (stage === "en_route" && isDel) {
    const when = isDel
      ? "30–60 mins (the store will confirm)"
      : "shortly";
    const text = `🚗 Your order from ${sn} is on the way!
Est. arrival: ${when}
#${booking.ref}
Track: ${ORDERS(booking.email)}`;
    await sendWhatsAppText(to, text, { type: "order_en_route" });
    return;
  }
  if (stage === "completed") {
    const rUrl = reviewUrlFor(booking);
    const text = `Thanks for shopping with ${sn} on Clip Services 🙏
We’d love your feedback:
${rUrl}`;
    await sendWhatsAppText(to, text, { type: "order_complete" });
  }
}

export async function waNotifyCustomerReview1hDelayed(listing, booking) {
  if (!isWhatsAppApiConfigured()) return;
  const to = toWhatsAppDigits(booking?.phone);
  if (!to) return;
  const cap = await tryWhatsAppNonTransactionalSlot(to);
  if (!cap.ok) return;
  const sn = storeName(listing);
  const rUrl = reviewUrlFor(booking);
  const text = `How was your order from ${sn}?
Quick review (2 taps): ⭐
${rUrl}`;
  const r = await sendWhatsAppText(to, text, { type: "review_prompt_1h" });
  if (!r.ok) void releaseWhatsAppNonTransactionalSlot(to);
}

export async function waNotifyCustomerReview24hReminder(listing, booking) {
  if (!isWhatsAppApiConfigured()) return;
  if (booking?.customerReviewSubmitted) return;
  const to = toWhatsAppDigits(booking?.phone);
  if (!to) return;
  const cap = await tryWhatsAppNonTransactionalSlot(to);
  if (!cap.ok) return;
  const name = firstName(booking);
  const sn = storeName(listing);
  const rUrl = reviewUrlFor(booking);
  const text = `Hi ${name}, how was your order from ${sn}?
Tap to leave a quick review ⭐
${rUrl}`;
  const r = await sendWhatsAppText(to, text, { type: "review_reminder_24h" });
  if (!r.ok) void releaseWhatsAppNonTransactionalSlot(to);
}

export async function waNotifyStoreNewReview(listing, review) {
  if (!isWhatsAppApiConfigured()) return;
  const prefs = listing?.notificationPrefs || {};
  if (prefs.reviewAlert === false) return;
  const to = toWhatsAppDigits(listing?.whatsappPhone);
  if (!to) return;
  const stars = Number(review?.rating) || 5;
  const txt = String(review?.text || "").trim().slice(0, 300);
  const cname = String(review?.customerFirstName || "A customer").slice(0, 60);
  const text = `⭐ New review on your store
${stars}/5 stars
“${txt}”
— ${cname}
${DASH()}`;
  await sendWhatsAppText(to, text, { type: "new_review_store" });
}

export async function waNotifyOnboarding48hCheckIn(listing) {
  if (!isWhatsAppApiConfigured()) return;
  if (listing?.applicationStatus && listing.applicationStatus !== "pending") return;
  if (await wasOnboarding48hSent(String(listing.id))) return;
  const to = toWhatsAppDigits(listing?.whatsappPhone);
  if (!to) return;
  const cap = await tryWhatsAppNonTransactionalSlot(to);
  if (!cap.ok) return;
  const who = String(listing?.ownerName || listing?.role || "there")
    .trim()
    .split(/\s/)[0];
  const text = `Hi ${who} 👋 Quick check-in — need help setting up your store? Reply here and we’ll walk you through it.`;
  const r = await sendWhatsAppText(to, text, { type: "onboard_48h" });
  if (!r.ok) void releaseWhatsAppNonTransactionalSlot(to);
  else void markOnboarding48hSent(String(listing.id));
}

export async function waNotifyStoreApproved(listing) {
  if (!isWhatsAppApiConfigured()) return;
  const to = toWhatsAppDigits(listing?.whatsappPhone);
  if (!to) return;
  const sn = storeName(listing);
  const slug = publicStoreSlug(listing);
  const text = `🎉 ${sn} is LIVE on Clip Services!
Store: ${siteUrl()}/stores/${encodeURIComponent(slug)}
1. Add products
2. Set opening hours
3. Share your link with customers
Dashboard: ${DASH()}`;
  const cap = await tryWhatsAppNonTransactionalSlot(to);
  if (!cap.ok) {
    const r = await sendWhatsAppText(to, text, { type: "store_approved" });
    return r;
  }
  const r = await sendWhatsAppText(to, text, { type: "store_approved" });
  if (!r.ok) void releaseWhatsAppNonTransactionalSlot(to);
  return r;
}

/* ── weekly & inactive (cron) ── */

function topProductName(listing) {
  const sp = Array.isArray(listing?.storeProducts) ? listing.storeProducts : [];
  let name = "";
  let best = 0;
  for (const p of sp) {
    const s = (p?.featured ? 2 : 0) + (p?.inStock !== false ? 1 : 0);
    if (s >= best) {
      best = s;
      name = String(p?.name || "").trim();
    }
  }
  return name || "—";
}

function reviewsLastWeekCount(listing) {
  const revs = Array.isArray(listing?.reviews) ? listing.reviews : [];
  const cutoff = Date.now() - 7 * 86400000;
  let n = 0;
  for (const r of revs) {
    const t = new Date(r?.date || 0).getTime();
    if (t >= cutoff) n += 1;
  }
  return n;
}

export async function waMaybeWeeklySummaryForStore(listing, ordersLast7) {
  if (!isWhatsAppApiConfigured()) return;
  if (!listing?.applicationStatus || listing.applicationStatus === "pending") return;
  const prefs = listing?.notificationPrefs || {};
  if (prefs.weeklySummary === false) return;
  if (await wasWeeklySummarySentThisWeek(String(listing.id))) return;
  const to = toWhatsAppDigits(listing?.whatsappPhone);
  if (!to) return;
  const cap = await tryWhatsAppNonTransactionalSlot(to);
  if (!cap.ok) return;
  const revN = reviewsLastWeekCount(listing);
  const rev = Array.isArray(ordersLast7)
    ? ordersLast7.reduce((s, b) => s + Number(b.subtotalGBP || b.totalGBP || 0), 0)
    : 0;
  const top = topProductName(listing);
  const text = `📊 Your week on Clip Services
Orders: ${ordersLast7.length}
Revenue: £${Math.round(rev * 100) / 100}
Top product: ${top}
New reviews: ${revN}
Keep going 💪🏾`;
  const r = await sendWhatsAppText(to, text, { type: "weekly_summary" });
  if (r.ok) {
    void markWeeklySummarySent(String(listing.id));
  } else {
    void releaseWhatsAppNonTransactionalSlot(to);
  }
}

export async function waMaybeInactiveNudgeForStore(listing) {
  if (!isWhatsAppApiConfigured()) return;
  if (!listing?.applicationStatus || listing.applicationStatus === "pending") return;
  if (await wasInactiveNudgeRecent(String(listing.id))) return;
  const to = toWhatsAppDigits(listing?.whatsappPhone);
  if (!to) return;
  const cap = await tryWhatsAppNonTransactionalSlot(to);
  if (!cap.ok) return;
  const text = `👀 No new orders in the last 7 days?
Try new products or refresh your page — it helps on Clip Services. ${DASH()}`;
  const r = await sendWhatsAppText(to, text, { type: "inactive_nudge" });
  if (r.ok) void markInactiveNudgeSent(String(listing.id));
  else void releaseWhatsAppNonTransactionalSlot(to);
}

/* ── schedule follow-ups when order completed ── */

export async function waScheduleOrderCompletedJobs(listing, booking) {
  const t1 = Date.now() + 60 * 60 * 1000;
  const t2 = Date.now() + 24 * 60 * 60 * 1000;
  void scheduleWaJob(t1, { kind: "wa_review_1h", ref: String(booking.ref) });
  void scheduleWaJob(t2, { kind: "wa_review_24h", ref: String(booking.ref) });
}

export async function runWaScheduledJob(job) {
  const kind = String(job?.kind || "");
  if (kind === "wa_onboard_48h") {
    const listing = await getMarketplaceListingById(String(job.listingId || ""));
    if (!listing) return;
    if (await wasOnboarding48hSent(String(listing.id))) return;
    await waNotifyOnboarding48hCheckIn(listing);
    return;
  }
  if (kind === "wa_review_1h" || kind === "wa_review_24h") {
    const ref = String(job?.ref || "");
    if (!ref) return;
    const booking = await getBookingByRef(ref);
    if (!booking?.marketplaceOrder) return;
    if (String(booking.storeStage) !== "completed") return;
    if (booking?.customerReviewSubmitted) return;
    const listing = await getMarketplaceListingById(String(booking.listingId));
    if (!listing) return;
    if (kind === "wa_review_1h") {
      await waNotifyCustomerReview1hDelayed(listing, booking);
    } else {
      await waNotifyCustomerReview24hReminder(listing, booking);
    }
    return;
  }
}

export async function runWhatsappPeriodicTasks(opts = {}) {
  const d = new Date();
  const inWeeklyWindow = d.getUTCDay() === 1 && d.getUTCHours() >= 7 && d.getUTCHours() <= 10;

  const due = await claimDueWaJobs(30);
  for (const j of due) {
    if (j?.kind) await runWaScheduledJob(j);
  }

  let weekly = 0;
  if (opts.runWeekly && inWeeklyWindow) {
    const bookings = await getBookings();
    const listings = await getMarketplaceListings();
    const weekAgo = Date.now() - 7 * 86400000;
    for (const l of listings) {
      if (!l?.id) continue;
      const id = String(l.id);
      const mOrders = (bookings || []).filter(
        (b) =>
          b?.marketplaceOrder && String(b.listingId) === id && b.status === "paid" && new Date(b.paidAt || 0) >= weekAgo
      );
      await waMaybeWeeklySummaryForStore(l, mOrders);
      weekly += 1;
    }
  }

  let nudges = 0;
  if (opts.runInactive) {
    const lastMap = await getListingLastOrderMap();
    const weekAgo = Date.now() - 7 * 86400000;
    const listings = await getMarketplaceListings();
    for (const l of listings) {
      if (!l?.id) continue;
      const last = lastMap[String(l.id)] ? Number(lastMap[String(l.id)]) : 0;
      if (last && last > weekAgo) continue;
      if (!last) {
        const created = new Date(l.publishedAt || 0).getTime();
        if (!created || created > weekAgo) continue;
      }
      await waMaybeInactiveNudgeForStore(l);
      nudges += 1;
    }
  }

  return { jobs: due.length, weekly, nudges, due: due.length };
}

export { isWhatsAppApiConfigured, toWhatsAppDigits };
