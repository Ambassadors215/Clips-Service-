/**
 * Marketplace order refs, contact verification, tracking URLs (guest + authenticated).
 */

import crypto from "node:crypto";
import { siteUrl } from "./site-url.js";

export function normalizeOrderEmail(email) {
  return String(email || "")
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "")
    .trim()
    .toLowerCase()
    .slice(0, 120);
}

/** UK-ish: digits only, compares last 10–11 digits. */
export function normalizeUkPhoneDigits(phone) {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.startsWith("44") && d.length >= 12) d = d.slice(2);
  if (d.startsWith("0") && d.length >= 10) d = d.slice(1);
  return d.slice(0, 15);
}

export function isValidMarketplaceOrderRef(ref) {
  const r = String(ref || "").trim().toUpperCase();
  if (/^CS-[A-Z0-9]{4,32}$/.test(r)) return true;
  if (/^CLS-[0-9]{4}-[0-9]{5}$/.test(r)) return true;
  return false;
}

export function contactsMatchBooking(booking, emailIn, phoneIn) {
  const em = normalizeOrderEmail(emailIn);
  if (em.length > 3 && /\S+@\S+\.\S+/.test(em) && normalizeOrderEmail(booking?.email) === em) return true;
  const pWant = normalizeUkPhoneDigits(phoneIn);
  const pGot = normalizeUkPhoneDigits(booking?.phone);
  if (pWant.length >= 10 && pGot.length >= 10) {
    if (pWant === pGot) return true;
    if (pGot.endsWith(pWant) || pWant.endsWith(pGot)) return true;
  }
  return false;
}

export function trackingMagicLink(booking) {
  const ref = String(booking?.ref || "").trim();
  const t = String(booking?.trackingToken || "").trim();
  if (!ref || !t || t.length < 16) return "";
  const u = `${siteUrl()}/track-order`;
  return `${u}?ref=${encodeURIComponent(ref)}&t=${encodeURIComponent(t)}`;
}

/** New paid orders — numeric tail reduces collision vs short base36 tokens. */
export async function allocateUniqueMarketplaceOrderRef(getBookingByRefFn) {
  const year = new Date().getFullYear();
  for (let attempts = 0; attempts < 12; attempts += 1) {
    const n = crypto.randomInt(10000, 100000);
    const ref = `CLS-${year}-${n}`;
    const clash = await getBookingByRefFn(ref);
    if (!clash) return ref;
  }
  const fallback = `CLS-${year}-${crypto.randomInt(10000, 100000)}`;
  return fallback;
}

export function newTrackingToken() {
  return crypto.randomBytes(24).toString("hex");
}
