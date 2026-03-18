import { endJson, getAdminApiUrl, readBody, requireAdmin, forwardJson } from "./_utils.js";

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== "POST") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    return endJson(res, 400, { ok: false, error: "Invalid JSON" });
  }

  const ref = String(payload?.ref || "").trim();
  const status = String(payload?.status || "").trim();
  const allowed = new Set(["new", "confirmed", "completed", "cancelled"]);
  if (!ref) return endJson(res, 400, { ok: false, error: "Missing ref" });
  if (!allowed.has(status)) return endJson(res, 400, { ok: false, error: "Invalid status" });

  const url = getAdminApiUrl(res);
  if (!url) return;

  const out = await forwardJson(url, { action: "updateBookingStatus", ref, status });
  if (!out.ok) return endJson(res, 502, { ok: false, error: out.data?.error || "Upstream failed" });

  return endJson(res, 200, { ok: true });
}

