/**
 * Single Vercel Serverless entry for all /api/* routes (except /api/admin/*).
 * Hobby plan limits deployments to 12 functions — one catch-all keeps us under the cap.
 */
import booking from "../lib/handlers/booking.js";
import contact from "../lib/handlers/contact.js";
import listings from "../lib/handlers/listings.js";
import pushVapid from "../lib/handlers/push-vapid.js";
import pushSubscribe from "../lib/handlers/push-subscribe.js";
import providerAuth from "../lib/handlers/provider-auth.js";
import dashboard from "../lib/handlers/dashboard.js";
import negotiate from "../lib/handlers/negotiate.js";
import connect from "../lib/handlers/connect.js";
import stripeWebhook from "../lib/handlers/stripe-webhook.js";
import stripeCheckout from "../lib/handlers/stripe-checkout.js";
import trackVisit from "../lib/handlers/track-visit.js";
import publicStats from "../lib/handlers/public-stats.js";
import sitemap from "../lib/handlers/sitemap.js";
import storeHtml from "../lib/handlers/store-html.js";
import cityHtml from "../lib/handlers/city-html.js";
import categoryHtml from "../lib/handlers/category-html.js";
import productHtml from "../lib/handlers/product-html.js";
import communityHtml from "../lib/handlers/community-html.js";
import productSeoHtml from "../lib/handlers/product-seo-html.js";
import blogHtml from "../lib/handlers/blog-html.js";
import blogManifest from "../lib/handlers/blog-manifest.js";
import blogRss from "../lib/handlers/blog-rss.js";
import newsletterSignup from "../lib/handlers/newsletter-signup.js";
import storeApplication from "../lib/handlers/store-application.js";
import onboardingTrack from "../lib/handlers/onboarding-track.js";
import storeOwnerApi from "../lib/handlers/store-owner-api.js";
import storeAnalytics from "../lib/handlers/store-analytics.js";
import orderPublic from "../lib/handlers/order-public.js";
import customerOrders from "../lib/handlers/customer-orders.js";
import orderReview from "../lib/handlers/order-review.js";
import pwaAnalytics from "../lib/handlers/pwa-analytics.js";
import searchApi from "../lib/handlers/search-api.js";
import searchEvent from "../lib/handlers/search-event.js";
import whatsappCron from "../lib/handlers/whatsapp-cron.js";
import whatsappWebhook from "../lib/handlers/whatsapp-webhook.js";

const handlers = {
  booking,
  contact,
  listings,
  "push-vapid": pushVapid,
  "push-subscribe": pushSubscribe,
  "provider-auth": providerAuth,
  dashboard,
  negotiate,
  connect,
  "stripe-webhook": stripeWebhook,
  "stripe-checkout": stripeCheckout,
  "track-visit": trackVisit,
  "public-stats": publicStats,
  sitemap,
  "store-html": storeHtml,
  "city-html": cityHtml,
  "category-html": categoryHtml,
  "product-html": productHtml,
  "community-html": communityHtml,
  "product-seo-html": productSeoHtml,
  "blog-html": blogHtml,
  "blog-manifest": blogManifest,
  "newsletter-signup": newsletterSignup,
  "blog-rss": blogRss,
  "store-application": storeApplication,
  "onboarding-track": onboardingTrack,
  "store-owner": storeOwnerApi,
  "store-analytics": storeAnalytics,
  "order-public": orderPublic,
  "customer-orders": customerOrders,
  "order-review": orderReview,
  "pwa-analytics": pwaAnalytics,
  search: searchApi,
  "search-event": searchEvent,
  "whatsapp-cron": whatsappCron,
  "whatsapp-webhook": whatsappWebhook,
};

function notFound(res) {
  res.statusCode = 404;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify({ ok: false, error: "Not found" }));
}

/**
 * Vercel rewrites in vercel.json (e.g. /categories/:slug -> /api/category-html?slug=:slug)
 * route the request to this catch-all function, but `req.url` still reflects the
 * original public path. We therefore route based on the original pathname here so
 * SSR pages keep working regardless of how the request reached the function.
 */
function resolveRoute(pathname, search) {
  // Direct /api/<name>(/...)? hits — preserve original behaviour.
  if (/^\/api(\/|$)/i.test(pathname)) {
    const tail = pathname.replace(/^\/api\/?/i, "");
    const parts = tail.split("/").filter(Boolean);
    return { key: parts[0] || "", extraQuery: "" };
  }

  // Public SSR routes that vercel.json rewrites at the edge.
  const m = (re) => pathname.match(re);
  let r;

  if (pathname === "/sitemap.xml") return { key: "sitemap", extraQuery: "" };
  if (pathname === "/blog/rss.xml") return { key: "blog-rss", extraQuery: "" };
  if (pathname === "/blog" || pathname === "/blog/") {
    return { key: "blog-html", extraQuery: "" };
  }
  if ((r = m(/^\/blog\/category\/([^/]+)\/?$/))) {
    return {
      key: "blog-html",
      extraQuery: `blogCategory=${encodeURIComponent(String(r[1]).toLowerCase())}`,
    };
  }
  if ((r = m(/^\/blog\/([^/]+)\/?$/))) {
    return { key: "blog-html", extraQuery: `slug=${encodeURIComponent(r[1])}` };
  }
  if ((r = m(/^\/categories\/([^/]+)\/?$/))) {
    return { key: "category-html", extraQuery: `slug=${encodeURIComponent(r[1])}` };
  }
  if ((r = m(/^\/cities\/([^/]+)\/?$/))) {
    return { key: "city-html", extraQuery: `city=${encodeURIComponent(r[1])}` };
  }
  if ((r = m(/^\/community\/([^/]+)\/?$/))) {
    return { key: "community-html", extraQuery: `slug=${encodeURIComponent(r[1])}` };
  }
  if ((r = m(/^\/products\/([^/]+)\/?$/))) {
    return { key: "product-seo-html", extraQuery: `slug=${encodeURIComponent(r[1])}` };
  }
  if ((r = m(/^\/store\/([^/]+)\/p\/([^/]+)\/([^/]+)\/?$/))) {
    return {
      key: "product-html",
      extraQuery: `storeId=${encodeURIComponent(r[1])}&idx=${encodeURIComponent(r[2])}`,
    };
  }
  if ((r = m(/^\/store\/([^/]+)\/?$/))) {
    return { key: "store-html", extraQuery: `id=${encodeURIComponent(r[1])}` };
  }
  if ((r = m(/^\/stores\/([^/]+)\/?$/))) {
    return { key: "store-html", extraQuery: `slug=${encodeURIComponent(r[1])}` };
  }

  return { key: "", extraQuery: "" };
}

export default async function handler(req, res) {
  const url = new URL(req.url || "/", "http://localhost");
  const route = resolveRoute(url.pathname, url.search);
  const fn = handlers[route.key];
  if (!fn) return notFound(res);

  // Splice extra query params (slug/city/id/etc.) into req.url so handlers that
  // parse `new URL(req.url)` continue to work without changes.
  if (route.extraQuery) {
    const sep = url.search ? "&" : "?";
    req.url = `${url.pathname}${url.search}${sep}${route.extraQuery}`;
  }
  return fn(req, res);
}
