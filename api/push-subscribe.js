import { addPushSubscription } from "../lib/kv-store.js";

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

export default async function handler(req, res) {
  if (req.method !== "POST") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    return endJson(res, 400, { ok: false, error: "Invalid JSON" });
  }

  const role = String(payload?.role || "").trim();
  const subscription = payload?.subscription;
  const token = String(payload?.adminToken || "").trim();

  if (role !== "customer" && role !== "admin") {
    return endJson(res, 400, { ok: false, error: "Invalid role" });
  }
  if (role === "admin") {
    if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
      return endJson(res, 401, { ok: false, error: "Unauthorized" });
    }
  }

  try {
    await addPushSubscription(role, subscription);
    return endJson(res, 200, { ok: true });
  } catch (e) {
    console.error("PUSH_SUB_ERR", e);
    return endJson(res, 400, { ok: false, error: "Invalid subscription" });
  }
}
