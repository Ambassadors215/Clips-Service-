import {
  isCustomerOtpInCooldown,
  setCustomerOtp,
  setCustomerOtpCooldown,
  verifyAndConsumeCustomerOtp,
  ensureCustomerProfile,
} from "../kv-store.js";
import { sendEmail, isEmailConfigured } from "../email.js";
import {
  CUSTOMER_SESSION_COOKIE,
  signCustomerSession,
  getCustomerSessionEmailFromReq,
} from "../customer-session.js";

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

function randomOtp6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function setSessionCookie(res, token) {
  const parts = [
    `${CUSTOMER_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=2592000",
  ];
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    parts.push("Secure");
  }
  res.setHeader("Set-Cookie", parts.join("; "));
}

function clearSessionCookie(res) {
  const parts = [`${CUSTOMER_SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    parts.push("Secure");
  }
  res.setHeader("Set-Cookie", parts.join("; "));
}

/** Soft SMTP-error mapper so customers see something actionable rather than raw nodemailer text. */
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

export default async function handler(req, res) {
  // whoami uses GET so the dashboard can boot without a round-trip POST
  if (req.method === "GET") {
    const url = new URL(req.url || "/", "http://localhost");
    const action = String(url.searchParams.get("action") || "whoami").trim();
    if (action === "whoami") {
      const email = getCustomerSessionEmailFromReq(req);
      return endJson(res, 200, { ok: true, email: email || null });
    }
    return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  }

  if (req.method !== "POST") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });

  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 16) {
    return endJson(res, 503, {
      ok: false,
      error: "Customer sign-in is not configured. Set SESSION_SECRET (16+ chars) on the server.",
    });
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    return endJson(res, 400, { ok: false, error: "Invalid JSON" });
  }

  const action = String(payload?.action || "").trim();

  if (action === "logout") {
    clearSessionCookie(res);
    return endJson(res, 200, { ok: true });
  }

  const email = String(payload?.email || "").trim().toLowerCase();
  if (!isValidEmail(email)) {
    return endJson(res, 400, { ok: false, error: "A valid email is required" });
  }

  if (action === "request-otp") {
    if (!isEmailConfigured()) {
      return endJson(res, 503, {
        ok: false,
        error: "Email isn't configured on the server right now — please try again later.",
      });
    }
    if (await isCustomerOtpInCooldown(email)) {
      return endJson(res, 429, { ok: false, error: "Please wait about a minute before requesting another code." });
    }
    const code = randomOtp6();
    const html = `<p>Your Clip Services sign-in code is:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:0.2em;font-family:ui-monospace,monospace">${code}</p>
<p>This code expires in 15 minutes. If you didn't request it you can safely ignore this email.</p>
<p>— Clip Services · Manchester</p>`;
    try {
      await sendEmail({
        to: email,
        subject: "Your Clip Services sign-in code",
        html,
      });
    } catch (e) {
      const hint = smtpHint(e);
      console.error("CUST_OTP_EMAIL_ERR", e?.message, e?.responseCode);
      return endJson(res, 500, {
        ok: false,
        error: hint ? `Couldn't send the code. ${hint}` : "Couldn't send the code. Try again shortly.",
      });
    }
    await setCustomerOtp(email, code);
    await setCustomerOtpCooldown(email, 45);
    return endJson(res, 200, { ok: true, sent: true });
  }

  if (action === "verify-otp") {
    const code = String(payload?.code || "").replace(/\D/g, "");
    if (code.length !== 6) {
      return endJson(res, 400, { ok: false, error: "Enter the 6-digit code from your email." });
    }
    const ok = await verifyAndConsumeCustomerOtp(email, code);
    if (!ok) {
      return endJson(res, 401, { ok: false, error: "Invalid or expired code. Request a new one." });
    }
    const token = signCustomerSession(email);
    if (!token) {
      return endJson(res, 500, { ok: false, error: "Couldn't create a session. Try again." });
    }
    setSessionCookie(res, token);
    // Materialise the profile on first successful sign-in.
    try {
      await ensureCustomerProfile(email);
    } catch (e) {
      console.error("CUST_ENSURE_PROFILE", e);
    }
    return endJson(res, 200, { ok: true, email });
  }

  return endJson(res, 400, { ok: false, error: "Unknown action" });
}
