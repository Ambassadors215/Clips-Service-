import { endJson, getAdminApiUrl, requireAdmin, forwardJson } from "./_utils.js";

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== "GET") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });

  const url = getAdminApiUrl(res);
  if (!url) return;

  const out = await forwardJson(url, { action: "listContacts" });
  if (!out.ok) return endJson(res, 502, { ok: false, error: out.data?.error || "Upstream failed" });

  return endJson(res, 200, { ok: true, items: out.data?.items || [] });
}

