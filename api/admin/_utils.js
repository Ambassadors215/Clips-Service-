function endJson(res, statusCode, obj) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(obj));
}

function readBody(req, limitBytes = 1024 * 1024) {
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

function requireAdmin(req, res) {
  const expected = process.env.ADMIN_TOKEN;
  const provided = req.headers["x-admin-token"];
  if (!expected) {
    endJson(res, 500, { ok: false, error: "ADMIN_TOKEN not configured" });
    return false;
  }
  if (!provided || provided !== expected) {
    endJson(res, 401, { ok: false, error: "Unauthorized" });
    return false;
  }
  return true;
}

function getAdminApiUrl(res) {
  const url = process.env.GOOGLE_SHEETS_ADMIN_API_URL;
  if (!url) {
    endJson(res, 500, { ok: false, error: "GOOGLE_SHEETS_ADMIN_API_URL not configured" });
    return null;
  }
  return url;
}

async function forwardJson(url, payload) {
  const token = process.env.ADMIN_TOKEN;
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...payload, token })
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

export { endJson, readBody, requireAdmin, getAdminApiUrl, forwardJson };

