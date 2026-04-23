import { runWhatsappPeriodicTasks } from "../whatsapp-notify.js";

function endJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  }
  const url = new URL(req.url || "/", "http://x");
  const secret = String(process.env.CRON_WHATSAPP_SECRET || process.env.CRON_SECRET || "").trim();
  const q = url.searchParams.get("secret") || "";
  const h = req.headers?.authorization?.replace(/^Bearer\s+/i, "") || "";
  const isVercelCron = String(req.headers?.["x-vercel-cron"] || "") === "1";
  const onVercel = Boolean(process.env.VERCEL);
  const authed =
    isVercelCron ||
    (secret && (q === secret || h === secret)) ||
    (!onVercel && !secret);
  if (!authed) {
    return endJson(res, 401, { ok: false, error: "Unauthorized" });
  }
  try {
    const d = new Date();
    const inWeeklyWindow = d.getUTCDay() === 1 && d.getUTCHours() >= 7 && d.getUTCHours() <= 10;
    const r = await runWhatsappPeriodicTasks({
      runWeekly: inWeeklyWindow,
      runInactive: true,
    });
    return endJson(res, 200, { ok: true, ...r });
  } catch (e) {
    console.error("WA_CRON", e);
    return endJson(res, 500, { ok: false, error: e?.message || "Cron failed" });
  }
}
