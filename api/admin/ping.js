import { endJson, requireAdmin } from "./_utils.js";

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  return endJson(res, 200, { ok: true });
}

