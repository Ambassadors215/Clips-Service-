import Stripe from "stripe";
import { upsertProvider, getProvider } from "../lib/kv-store.js";

function endJson(res, statusCode, obj) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(obj));
}

function siteOrigin() {
  return String(process.env.SITE_URL || "https://clips-service.vercel.app").replace(/\/$/, "");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });

  const token = req.headers["x-admin-token"];
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || token !== expected) return endJson(res, 401, { ok: false, error: "Unauthorized" });
  if (!process.env.STRIPE_SECRET_KEY) return endJson(res, 500, { ok: false, error: "Stripe not configured" });

  let body;
  try {
    body = typeof req.body === "object" ? req.body : JSON.parse(await readBody(req));
  } catch {
    return endJson(res, 400, { ok: false, error: "Invalid JSON" });
  }

  const { providerId, providerName, providerEmail } = body;
  if (!providerId || !providerName || !providerEmail) {
    return endJson(res, 400, { ok: false, error: "Missing providerId, providerName, or providerEmail" });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const origin = siteOrigin();

  try {
    const existing = await getProvider(providerId);

    let accountId = existing?.stripeAccountId;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "GB",
        email: providerEmail,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        business_type: "individual",
        metadata: { providerId: String(providerId), providerName },
      });
      accountId = account.id;
      await upsertProvider(providerId, {
        name: providerName,
        email: providerEmail,
        stripeAccountId: accountId,
        onboarded: false,
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/admin/`,
      return_url: `${origin}/admin/?connect=done&provider=${encodeURIComponent(providerId)}`,
      type: "account_onboarding",
    });

    return endJson(res, 200, { ok: true, url: accountLink.url, accountId });
  } catch (e) {
    console.error("CONNECT_ONBOARD_ERROR", e);
    return endJson(res, 500, { ok: false, error: e.message || "Failed to create Connect account" });
  }
}

function readBody(req, limitBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limitBytes) { reject(new Error("Payload too large")); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
