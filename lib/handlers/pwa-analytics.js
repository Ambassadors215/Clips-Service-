import { incrementPwaMetric, incrementPwaDailyOpen } from "../kv-store.js";

function readBody(req, limit = 16 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
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

function endJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.setHeader("access-control-allow-origin", "*");
  res.end(JSON.stringify(obj));
}

const ALLOWED = new Set([
  "install_prompt_shown",
  "install_cta_click",
  "install_dismiss_7d",
  "appinstalled",
  "standalone_session",
  "order_completed_in_pwa",
]);

/** Lightweight public POST for PWA client metrics (no PII). */
export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("access-control-allow-methods", "POST, OPTIONS");
    res.setHeader("access-control-allow-headers", "content-type");
    res.setHeader("access-control-max-age", "86400");
    res.setHeader("access-control-allow-origin", "*");
    res.end();
    return;
  }

  if (req.method !== "POST") {
    return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  }

  let body;
  try {
    body = JSON.parse((await readBody(req)) || "{}");
  } catch {
    return endJson(res, 400, { ok: false, error: "Invalid JSON" });
  }

  const event = String(body?.event || "").trim();
  if (!ALLOWED.has(event)) {
    return endJson(res, 400, { ok: false, error: "Unknown event" });
  }

  try {
    await incrementPwaMetric(event, 1);
    if (event === "standalone_session") {
      await incrementPwaDailyOpen();
    }
    return endJson(res, 200, { ok: true });
  } catch (e) {
    console.error("PWA_ANALYTICS", e);
    return endJson(res, 200, { ok: true, queued: false });
  }
}
