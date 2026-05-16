import bcrypt from "bcryptjs";
import {
  authRateConsume,
  createCustomerAuthSession,
  ensureCustomerProfile,
  getCustomerAuthPayloadForEmail,
  getCustomerAuthUserRecord,
  isCustomerEmailVerifyCooldown,
  isCustomerPwResetCooldown,
  isKvRedisConfigured,
  patchCustomerProfile,
  setCustomerEmailVerifyCooldown,
  setCustomerEmailVerifyOtp,
  setCustomerPwResetCooldown,
  setCustomerPwResetOtp,
  updateCustomerPasswordHash,
  upsertCustomerAuthPendingUser,
  verifyAndConsumeCustomerEmailVerifyOtp,
  verifyAndConsumeCustomerPwResetOtp,
  setCustomerVerifiedAndPassword,
} from "../kv-store.js";
import { sendEmail, isEmailConfigured } from "../email.js";
import {
  deleteOpaqueSidFromCookie,
  formatOpaqueSessionCookie,
  getCustomerSessionEmailFromReq,
} from "../customer-session.js";

const BCRYPT_ROUNDS = 12;

function readBody(req, limitBytes = 65536) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
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

function endJson(res, statusCode, obj) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(obj));
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function clampStr(v, max) {
  return String(v == null ? "" : v)
    .trim()
    .slice(0, max);
}

function clientIp(req) {
  const xff = req.headers?.["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) return xff.split(",")[0].trim().slice(0, 64).replace(/^::ffff:/, "");
  return String(req.socket?.remoteAddress || "")
    .replace(/^::ffff:/, "")
    .slice(0, 64);
}

function randomOtp6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function sanitizeReturnUrl(s, fallback = "/") {
  const x = typeof s === "string" ? s.trim() : "";
  if (!x || x.startsWith("//") || !x.startsWith("/") || x.length > 512) return fallback;
  return x.split("#")[0] || fallback;
}

function setCustSessionCookie(res, tokenValue, maxAgeSec) {
  const parts = [
    `${CUSTOMER_SESSION_COOKIE}=${encodeURIComponent(tokenValue)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.max(60, Math.floor(Number(maxAgeSec) || 0))}`,
  ];
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    parts.push("Secure");
  }
  res.setHeader("Set-Cookie", parts.join("; "));
}

async function clearSessionCookies(res, req) {
  await deleteOpaqueSidFromCookie(req);
  const parts = [`${CUSTOMER_SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    parts.push("Secure");
  }
  res.setHeader("Set-Cookie", parts.join("; "));
}

function smtpHint(err) {
  const raw = [err?.message, err?.response, String(err?.responseCode ?? "")]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!raw) return "";
  if (raw.includes("authoriz") || raw.includes("not allowed") || raw.includes("recipient")) {
    return "Your mail provider may be blocked from receiving from us. Try a different email or contact support.";
  }
  if (raw.includes("timeout") || raw.includes("econnrefused") || raw.includes("enotfound")) {
    return "Couldn't reach the mail server. Try again in a moment.";
  }
  return "";
}

async function attachSessionCookie(res, email, rememberMe) {
  const ttlRemember = 60 * 60 * 24 * 90;
  const ttlDefault = 60 * 60 * 24 * 14;
  const ttl = rememberMe ? ttlRemember : ttlDefault;
  const sess = await createCustomerAuthSession(email, ttl);
  if (!sess?.sid) return false;
  const opaque = formatOpaqueSessionCookie(sess);
  if (!opaque) return false;
  setCustSessionCookie(res, opaque, ttl);
  return true;
}

async function mergeAuthUserIntoProfile(email) {
  const u = await getCustomerAuthUserRecord(email);
  if (!u) return;
  const patch = {
    firstName: u.firstName || "",
    lastName: u.lastName || "",
    phone: u.phone || "",
  };
  if (u.city && String(u.city).trim()) {
    patch.preferredArea = clampStr(u.city, 60);
  }
  try {
    await ensureCustomerProfile(email);
    await patchCustomerProfile(email, patch);
  } catch (e) {
    console.error("CUSTOMER_MERGE_PROFILE", e?.message || e);
  }
}

async function maybeRate(req, bucket, limit, windowSec) {
  if (!isKvRedisConfigured()) return false;
  const ip = clientIp(req);
  return (await authRateConsume(ip, bucket, limit, windowSec)) === true;
}

export default async function handler(req, res) {
  const secretConfigured = !!(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16);

  /* ----------------------------- GET ---------------------------- */
  if (req.method === "GET") {
    const url = new URL(req.url || "/", "http://localhost");
    const action = String(url.searchParams.get("action") || "whoami").trim();
    if (action !== "whoami") {
      return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    try {
      const email = secretConfigured ? await getCustomerSessionEmailFromReq(req) : null;
      const authPayload = email ? await getCustomerAuthPayloadForEmail(email) : null;
      return endJson(res, 200, {
        ok: true,
        email: email || null,
        emailVerified: !!(authPayload && authPayload.emailVerified),
        kvReady: isKvRedisConfigured(),
      });
    } catch {
      return endJson(res, 200, { ok: true, email: null, emailVerified: false });
    }
  }

  /* --------------------------- POST ---------------------------- */
  if (req.method !== "POST") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });

  if (!secretConfigured) {
    return endJson(res, 503, {
      ok: false,
      error: "Sign-in isn't configured yet. SESSION_SECRET must be set (16+ characters).",
    });
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    return endJson(res, 400, { ok: false, error: "Invalid JSON" });
  }

  const action = String(payload?.action || "").trim();

  /** Legacy OTP flow removed — avoids half-working email-only sessions mixed with passwords. */
  if (action === "request-otp" || action === "verify-otp") {
    return endJson(res, 410, {
      ok: false,
      code: "auth_migrated_password",
      error: "This sign-in method has been replaced. Please create an account or sign in with your password.",
    });
  }

  if (action === "logout") {
    await clearSessionCookies(res, req);
    return endJson(res, 200, { ok: true });
  }

  try {
    if (action === "register") {
      if (await maybeRate(req, "cust_register_submit", 25, 7200)) {
        return endJson(res, 429, { ok: false, error: "Too many sign-up attempts. Try again later." });
      }
      const firstName = clampStr(payload.firstName, 80);
      const lastName = clampStr(payload.lastName, 80);
      const email = clampStr(payload.email, 254).toLowerCase();
      const password = typeof payload.password === "string" ? payload.password : "";
      const confirm = typeof payload.confirmPassword === "string" ? payload.confirmPassword : "";
      const phone = clampStr(payload.phone, 40);
      const city = clampStr(payload.city, 80);
      const returnUrl = sanitizeReturnUrl(payload.returnUrl || payload.next, "/");

      if (!firstName || !lastName || !isValidEmail(email)) {
        return endJson(res, 400, {
          ok: false,
          error: "Enter your full name and a valid email address.",
          fields: { firstName: !firstName ? "required" : null, lastName: !lastName ? "required" : null, email: !isValidEmail(email) ? "invalid" : null },
        });
      }
      if (password.length < 8) {
        return endJson(res, 400, { ok: false, error: "Password must be at least 8 characters.", fields: { password: "min8" } });
      }
      if (password !== confirm) {
        return endJson(res, 400, { ok: false, error: "Passwords don't match.", fields: { confirmPassword: "mismatch" } });
      }

      const existing = await getCustomerAuthUserRecord(email);
      if (existing?.emailVerified) {
        return endJson(res, 409, { ok: false, error: "An account already exists for this email. Sign in instead." });
      }

      const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const row = await upsertCustomerAuthPendingUser({
        email,
        passwordHash: hash,
        firstName,
        lastName,
        phone,
        city,
      });
      if (!row) {
        return endJson(res, 503, {
          ok: false,
          error: "Couldn't save your account draft. Password storage appears unavailable.",
        });
      }

      if (!isEmailConfigured()) {
        return endJson(res, 503, {
          ok: false,
          error: "Mail isn't configured yet — verification codes can't be sent. Try again shortly.",
        });
      }

      if (await isCustomerEmailVerifyCooldown(email)) {
        return endJson(res, 429, { ok: false, error: "Please wait ~1 minute before requesting another code." });
      }

      const code = randomOtp6();
      const html = `<p>Verify your Clip Services account with this code:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:0.18em;font-family:ui-monospace,monospace">${code}</p>
<p>This expires in 15 minutes. If you didn't create an account, ignore this email.</p>
<p>— Clip Services · Manchester</p>`;
      try {
        await sendEmail({
          to: email,
          subject: "Verify your Clip Services account",
          html,
        });
      } catch (e) {
        const hint = smtpHint(e);
        console.error("CUST_VERIFY_EMAIL_SEND", e?.message, e?.responseCode);
        return endJson(res, 500, {
          ok: false,
          error: hint ? `Couldn't send verification. ${hint}` : "Couldn't send verification email.",
        });
      }
      await setCustomerEmailVerifyOtp(email, code);
      await setCustomerEmailVerifyCooldown(email, 50);
      return endJson(res, 200, { ok: true, needsVerification: true, email, returnUrl });
    }

    if (action === "resend-verification") {
      if (await maybeRate(req, "cust_verify_resend", 14, 900)) {
        return endJson(res, 429, { ok: false, error: "Please wait before resending a code." });
      }
      const email = clampStr(payload.email, 254).toLowerCase();
      if (!isValidEmail(email)) {
        return endJson(res, 400, { ok: false, error: "Enter the email you're verifying." });
      }
      const u = await getCustomerAuthUserRecord(email);
      if (!u) return endJson(res, 200, { ok: true, sent: false });
      if (u.emailVerified) {
        return endJson(res, 200, { ok: true, sent: false, alreadyVerified: true });
      }

      if (!isEmailConfigured()) {
        return endJson(res, 503, { ok: false, error: "Email isn't configured on the server right now." });
      }
      if (await isCustomerEmailVerifyCooldown(email)) {
        return endJson(res, 429, { ok: false, error: "Please wait about a minute before resending." });
      }

      const code = randomOtp6();
      try {
        await sendEmail({
          to: email,
          subject: "Your Clip Services verification code",
          html: `<p>Your Clip Services verification code is:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:0.18em;font-family:ui-monospace,monospace">${code}</p>
<p>Expires in 15 minutes.</p><p>— Clip Services · Manchester</p>`,
        });
      } catch (e) {
        const hint = smtpHint(e);
        return endJson(res, 500, { ok: false, error: hint ? `Couldn't send code. ${hint}` : "Couldn't send code." });
      }
      await setCustomerEmailVerifyOtp(email, code);
      await setCustomerEmailVerifyCooldown(email, 50);
      return endJson(res, 200, { ok: true, sent: true });
    }

    if (action === "verify-email") {
      if (await maybeRate(req, "cust_verify_submit", 50, 900)) {
        return endJson(res, 429, { ok: false, error: "Too many verification attempts." });
      }
      const email = clampStr(payload.email, 254).toLowerCase();
      const code = String(payload.code || "").replace(/\D/g, "");
      const rememberMe = !!payload.rememberMe;
      const returnUrl = sanitizeReturnUrl(payload.returnUrl || payload.next, "/");

      if (!isValidEmail(email) || code.length !== 6) {
        return endJson(res, 400, { ok: false, error: "Enter your email and the 6-digit code." });
      }
      const u = await getCustomerAuthUserRecord(email);
      if (!u || !u.passwordHash) return endJson(res, 400, { ok: false, error: "No pending registration found for this email." });
      if (u.emailVerified) {
        const sessOk = await attachSessionCookie(res, email, rememberMe);
        if (!sessOk) return endJson(res, 503, { ok: false, error: "Couldn't start a signed-in session. Try signing in manually." });
        return endJson(res, 200, { ok: true, email, verified: true, returnUrl });
      }

      const okCode = await verifyAndConsumeCustomerEmailVerifyOtp(email, code);
      if (!okCode) {
        return endJson(res, 401, { ok: false, error: "Invalid or expired code. Request a new one." });
      }

      await setCustomerVerifiedAndPassword(email, true, null);
      await mergeAuthUserIntoProfile(email);
      await ensureCustomerProfile(email);

      const sessOk = await attachSessionCookie(res, email, rememberMe);
      if (!sessOk) {
        return endJson(res, 503, { ok: false, error: "Account verified but couldn't create a browser session." });
      }
      return endJson(res, 200, { ok: true, email, verified: true, returnUrl });
    }

    if (action === "login") {
      if (await maybeRate(req, "cust_pw_login", 40, 900)) {
        return endJson(res, 429, { ok: false, error: "Too many sign-in attempts. Try again soon." });
      }
      const email = clampStr(payload.email, 254).toLowerCase();
      const password = typeof payload.password === "string" ? payload.password : "";
      const rememberMe = !!payload.rememberMe;
      const returnUrl = sanitizeReturnUrl(payload.returnUrl || payload.next, "/");

      if (!isValidEmail(email) || !password) {
        return endJson(res, 400, { ok: false, error: "Enter your email and password." });
      }

      const u = await getCustomerAuthUserRecord(email);
      if (!u?.passwordHash) {
        /** Avoid account enumeration leakage — identical message vs wrong password when possible */
        await bcrypt.hash("x".repeat(Math.max(12, password.length)), 4); // tiny timing noise
        return endJson(res, 401, { ok: false, error: "Email or password is incorrect.", code: "invalid_credentials" });
      }
      if (!u.emailVerified) {
        return endJson(res, 403, {
          ok: false,
          error: "Please verify your email first. We've sent instructions when you signed up.",
          code: "unverified_email",
          email,
        });
      }

      const match = await bcrypt.compare(password, u.passwordHash);
      if (!match) {
        return endJson(res, 401, { ok: false, error: "Email or password is incorrect.", code: "invalid_credentials" });
      }

      const sessOk = await attachSessionCookie(res, email, rememberMe);
      if (!sessOk) {
        return endJson(res, 503, { ok: false, error: "Couldn't create session. Authentication storage might be unavailable." });
      }

      await mergeAuthUserIntoProfile(email);
      return endJson(res, 200, { ok: true, email, returnUrl });
    }

    if (action === "forgot-password") {
      if (await maybeRate(req, "cust_pw_forget", 12, 3600)) {
        return endJson(res, 429, { ok: false, error: "Too many reset requests." });
      }
      const email = clampStr(payload.email, 254).toLowerCase();
      if (!isValidEmail(email)) return endJson(res, 400, { ok: false, error: "Enter a valid email." });

      if (!isEmailConfigured()) return endJson(res, 200, { ok: true, sentHint: false });

      if (await isCustomerPwResetCooldown(email)) return endJson(res, 200, { ok: true, sentHint: true });

      const u = await getCustomerAuthUserRecord(email);
      if (!u?.emailVerified) return endJson(res, 200, { ok: true, sentHint: true });

      const code = randomOtp6();
      try {
        await sendEmail({
          to: email,
          subject: "Reset your Clip Services password",
          html: `<p>Use this reset code:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:0.18em;font-family:ui-monospace,monospace">${code}</p>
<p>Expires in 15 minutes.</p><p>If you didn't request this, ignore the email.</p><p>— Clip Services · Manchester</p>`,
        });
      } catch (e) {
        console.error("PWD_RESET_MAIL", e?.message);
      }
      await setCustomerPwResetOtp(email, code);
      await setCustomerPwResetCooldown(email, 60);
      return endJson(res, 200, { ok: true, sentHint: true });
    }

    if (action === "reset-password") {
      if (await maybeRate(req, "cust_pw_reset_submit", 20, 900)) {
        return endJson(res, 429, { ok: false, error: "Too many attempts. Slow down." });
      }
      const email = clampStr(payload.email, 254).toLowerCase();
      const code = String(payload.code || "").replace(/\D/g, "");
      const newPassword = typeof payload.newPassword === "string" ? payload.newPassword : "";
      const confirm = typeof payload.confirmPassword === "string" ? payload.confirmPassword : "";
      const returnUrl = sanitizeReturnUrl(payload.returnUrl || payload.next, "/");

      if (!isValidEmail(email) || code.length !== 6) {
        return endJson(res, 400, { ok: false, error: "Email and reset code required." });
      }
      if (newPassword.length < 8 || newPassword !== confirm) {
        return endJson(res, 400, { ok: false, error: "Password must be 8+ characters and fields must match." });
      }

      const okReset = await verifyAndConsumeCustomerPwResetOtp(email, code);
      if (!okReset) return endJson(res, 401, { ok: false, error: "Invalid or expired reset code." });

      const u = await getCustomerAuthUserRecord(email);
      if (!u?.emailVerified) return endJson(res, 400, { ok: false, error: "Account not verified." });

      const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      await updateCustomerPasswordHash(email, hash);

      await clearSessionCookies(res, req);
      const sessOk = await attachSessionCookie(res, email, true);
      if (!sessOk) {
        return endJson(res, 200, { ok: true, passwordReset: true, returnUrl, signInRequired: true });
      }
      return endJson(res, 200, { ok: true, passwordReset: true, email, returnUrl });
    }

    return endJson(res, 400, { ok: false, error: "Unknown action" });
  } catch (e) {
    console.error("CUSTOMER_AUTH", e?.message || e);
    return endJson(res, 500, { ok: false, error: "Server error during sign-in" });
  }
}
