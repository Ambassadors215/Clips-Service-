import Stripe from "stripe";
import { getProvider, upsertProvider } from "../lib/kv-store.js";

function endJson(res, statusCode, obj) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  if (req.method !== "GET") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });

  const token = req.headers["x-admin-token"];
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || token !== expected) return endJson(res, 401, { ok: false, error: "Unauthorized" });
  if (!process.env.STRIPE_SECRET_KEY) return endJson(res, 500, { ok: false, error: "Stripe not configured" });

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const providerId = url.searchParams.get("id");
  if (!providerId) return endJson(res, 400, { ok: false, error: "Missing id param" });

  const provider = await getProvider(providerId);
  if (!provider?.stripeAccountId) {
    return endJson(res, 200, { ok: true, connected: false, onboarded: false });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const account = await stripe.accounts.retrieve(provider.stripeAccountId);
    const onboarded = account.charges_enabled && account.payouts_enabled;

    if (onboarded && !provider.onboarded) {
      await upsertProvider(providerId, { onboarded: true });
    }

    return endJson(res, 200, {
      ok: true,
      connected: true,
      onboarded,
      accountId: provider.stripeAccountId,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    });
  } catch (e) {
    console.error("CONNECT_STATUS_ERROR", e);
    return endJson(res, 500, { ok: false, error: e.message });
  }
}
