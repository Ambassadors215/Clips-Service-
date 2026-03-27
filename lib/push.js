import webpush from "web-push";
import { getPushSubscriptions, removePushSubscription } from "./kv-store.js";

export function isPushConfigured() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_PUBLIC_KEY.length > 20
  );
}

function configureWebPush() {
  if (!isPushConfigured()) return false;
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_CONTACT_EMAIL || "soniaotikpa@gmail.com"}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  return true;
}

/**
 * @param {'customer'|'admin'} role
 * @param {{ title: string; body: string; url?: string }} payload
 */
export async function notifyPushRole(role, payload) {
  if (!configureWebPush()) return;
  const subs = await getPushSubscriptions(role);
  if (!subs.length) return;
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/clip-services-marketplace.html",
  });
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, body, { TTL: 3600 });
      } catch (e) {
        const status = e?.statusCode;
        if (status === 404 || status === 410) {
          await removePushSubscription(role, sub.endpoint);
        } else {
          console.error("PUSH_SEND_ERR", status, e?.message);
        }
      }
    })
  );
}
