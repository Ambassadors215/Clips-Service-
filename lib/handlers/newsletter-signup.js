import { addContact } from "../kv-store.js";
import { siteUrl } from "../site-url.js";

function readBody(req, limitBytes = 8192) {
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

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function buildRedirect(base, nextRaw, status) {
  let path = "/blog";
  let existingQuery = "";
  const trimmed = String(nextRaw || "").trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    const noHash = trimmed.split("#")[0];
    const q = noHash.indexOf("?");
    if (q >= 0) {
      path = noHash.slice(0, q);
      existingQuery = noHash.slice(q + 1);
    } else {
      path = noHash;
    }
  }
  if (!path.startsWith("/")) path = "/blog";
  const params = new URLSearchParams(existingQuery);
  params.set("newsletter", status);
  const qs = params.toString();
  return `${base}${path}${qs ? `?${qs}` : ""}`;
}

function wantsJson(req) {
  const accept = String(req.headers.accept || "").toLowerCase();
  try {
    const u = new URL(req.url || "/", "http://localhost");
    return accept.includes("application/json") || u.searchParams.get("format") === "json";
  } catch {
    return accept.includes("application/json");
  }
}

function respondJson(res, code, payload) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store, must-revalidate");
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Method Not Allowed");
    return;
  }

  const base = siteUrl();

  let email = "";
  let firstName = "";
  let nextPath = "";
  let city = "";
  let source = "";
  try {
    const ct = String(req.headers["content-type"] || "");
    const raw = await readBody(req);
    if (ct.includes("application/json")) {
      try {
        const j = JSON.parse(raw);
        email = String(j?.email || "").trim();
        firstName = String(j?.firstName || "").trim().slice(0, 120);
        nextPath = String(j?.next || "").trim().slice(0, 240);
        city = String(j?.city || "").trim().slice(0, 120);
        source = String(j?.source || "").trim().slice(0, 80);
      } catch {
        if (wantsJson(req)) return respondJson(res, 400, { ok: false, error: "invalid_json" });
        res.statusCode = 400;
        res.end("Invalid JSON");
        return;
      }
    } else {
      const params = new URLSearchParams(raw);
      email = String(params.get("email") || "").trim();
      firstName = String(params.get("firstName") || "").trim().slice(0, 120);
      nextPath = String(params.get("next") || "").trim().slice(0, 240);
      city = String(params.get("city") || "").trim().slice(0, 120);
      source = String(params.get("source") || "").trim().slice(0, 80);
    }
  } catch {
    res.statusCode = 400;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Bad Request");
    return;
  }

  if (!isValidEmail(email)) {
    if (wantsJson(req))
      return respondJson(res, 422, {
        ok: false,
        error: "invalid_email",
        message: "Please enter a valid email address.",
      });
    res.statusCode = 303;
    res.setHeader("Location", buildRedirect(base, nextPath || "/blog", "invalid"));
    res.end();
    return;
  }

  const webhook = String(process.env.NEWSLETTER_WEBHOOK_URL || "").trim();

  const normalisedSource = (source || "clip-services-blog").slice(0, 80);
  const isCityWaitlist = /city|waitlist|launch/i.test(normalisedSource) || !!city;
  const applicationType = isCityWaitlist ? "city-waitlist" : "newsletter";
  const tagLine = isCityWaitlist
    ? `[CITY WAITLIST]\nVisitor asked to be notified when Clip Services launches in their city.\nCity (visitor self-reported): ${city || "—"}\nPreferred name (optional): ${firstName || "—"}\nSource: ${normalisedSource}`
    : `[NEWSLETTER SIGNUP]\nSubmitted from blog/footer.\nPreferred name (optional): ${firstName || "—"}${city ? `\nCity (optional): ${city}` : ""}\nSource: ${normalisedSource}`;

  try {
    if (webhook) {
      await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          firstName: firstName || undefined,
          city: city || undefined,
          source: normalisedSource,
          ts: new Date().toISOString(),
        }),
      }).catch(() => {});
    }

    await addContact({
      createdAt: new Date().toISOString(),
      name: firstName || (isCityWaitlist ? "City waitlist subscriber" : "Newsletter subscriber"),
      email: email.trim().toLowerCase(),
      message: tagLine,
      applicationType,
    });
  } catch (e) {
    console.error("NEWSLETTER_SIGNUP", e);
    if (wantsJson(req)) {
      return respondJson(res, 503, {
        ok: false,
        error: "signup_unavailable",
        message:
          "Signup is temporarily unavailable. Please try again or email clipservices26@gmail.com",
      });
    }
    res.statusCode = 503;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end('<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"><title>Signup unavailable</title></head><body><p>Signup is temporarily unavailable. Please try again shortly or email <a href="mailto:clipservices26@gmail.com">clipservices26@gmail.com</a>.</p><p><a href="/blog">← Blog</a></p></body></html>');
    return;
  }

  if (wantsJson(req)) {
    return respondJson(res, 200, {
      ok: true,
      message: "Thanks for subscribing to Clip Services 🎉",
    });
  }

  res.statusCode = 303;
  res.setHeader("Location", buildRedirect(base, nextPath || "/blog", "ok"));
  res.end();
}
