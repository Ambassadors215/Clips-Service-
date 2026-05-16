import crypto from "node:crypto";
import {
  deleteCustomerAuthSession,
  getCustomerAuthPayloadForEmail,
  getCustomerAuthSession,
} from "./kv-store.js";

/**
 * Customer (shopper) session — separate from PROVIDER_SESSION_COOKIE so a
 * store owner who also shops as a customer can have two independent sessions.
 */
export const CUSTOMER_SESSION_COOKIE = "cs_cust_sess";

function sessionSecret() {
  const s = process.env.SESSION_SECRET || "";
  return s.length >= 16 ? s : "";
}

function readCookie(req, name) {
  const raw = req.headers?.cookie;
  if (!raw || typeof raw !== "string") return null;
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    if (k !== name) continue;
    const v = part.slice(idx + 1).trim();
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  }
  return null;
}

function sigEq(a, b) {
  const x = String(a || "");
  const y = String(b || "");
  if (x.length !== y.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(x, "utf8"), Buffer.from(y, "utf8"));
  } catch {
    return false;
  }
}

function opaqueSessionSig(sid, secret) {
  return crypto.createHmac("sha256", secret).update(`v1:${sid}`).digest("base64url");
}

/** Legacy signed token: base64url(payload).hmac — payload decodes to JSON {email,exp,kind}. */
export function signCustomerSession(email) {
  const secret = sessionSecret();
  if (!secret) return null;
  const e = String(email || "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
  const payload = JSON.stringify({ email: e, exp, kind: "customer" });
  const payloadB64 = Buffer.from(payload, "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
  return `${payloadB64}.${sig}`;
}

export function verifyCustomerSession(token) {
  if (!token || typeof token !== "string") return null;
  const secret = sessionSecret();
  if (!secret) return null;
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const payloadB64 = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expect = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
  if (!sigEq(expect, sig) || !payloadB64) return null;
  let obj;
  try {
    obj = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!obj?.email || typeof obj.exp !== "number") return null;
  if (obj.exp < Math.floor(Date.now() / 1000)) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(obj.email)) return null;
  return String(obj.email).toLowerCase();
}

/**
 * Builds `sessionId.signature` for Set-Cookie — session row must already exist in KV.
 * @param {{ sid: string, exp: number }} session
 */
export function formatOpaqueSessionCookie(session) {
  const secret = sessionSecret();
  if (!secret || !session?.sid) return null;
  return `${session.sid}.${opaqueSessionSig(session.sid, secret)}`;
}

/**
 * Parses cs_cust_sess: supports opaque KV sessions first, then legacy HMAC blobs.
 */
export async function resolveCustomerEmailFromCookieToken(token) {
  if (!token || typeof token !== "string") return null;
  const secret = sessionSecret();
  if (!secret) return null;
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const left = token.slice(0, i);
  const right = token.slice(i + 1);

  /** Opaque KV session token (hex session id — 64 chars). */
  if (/^[a-f0-9]{64}$/i.test(left)) {
    const sid = left.toLowerCase();
    const expectSig = opaqueSessionSig(sid, secret);
    if (!sigEq(expectSig, right)) return null;
    const row = await getCustomerAuthSession(sid);
    if (!row?.email) return null;
    const gate = await getCustomerAuthPayloadForEmail(row.email);
    if (!gate?.emailVerified) return null;
    return row.email;
  }

  /** Legacy bearer token issued before opaque sessions — still honours expiry in payload only. */
  const legacy = verifyCustomerSession(token);
  if (!legacy) return null;
  const legacyGate = await getCustomerAuthPayloadForEmail(legacy);
  if (legacyGate && !legacyGate.emailVerified) return null;
  return legacy;
}

/** Async session resolution — use from API handlers instead of deprecated sync getters. */
export async function getCustomerSessionEmailFromReq(req) {
  const tok = readCookie(req, CUSTOMER_SESSION_COOKIE);
  return resolveCustomerEmailFromCookieToken(tok);
}

/** @deprecated Use getCustomerSessionEmailFromReq(req) awaiting the promise instead. */
export function getLegacyCustomerSyncEmail(req) {
  const tok = readCookie(req, CUSTOMER_SESSION_COOKIE);
  return tok ? verifyCustomerSession(tok) : null;
}

/** Revoke KV-backed opaque session referenced by incoming cookie (no-op for legacy JWT cookies). */
export async function deleteOpaqueSidFromCookie(req) {
  const tok = readCookie(req, CUSTOMER_SESSION_COOKIE);
  if (!tok) return;
  const i = tok.lastIndexOf(".");
  if (i < 0) return;
  const left = tok.slice(0, i);
  if (!/^[a-f0-9]{64}$/i.test(left)) return;
  await deleteCustomerAuthSession(left.toLowerCase());
}
