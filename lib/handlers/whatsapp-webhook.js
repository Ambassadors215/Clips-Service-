import { sendWhatsAppText, toWhatsAppDigits, isWhatsAppApiConfigured } from "../whatsapp-send.js";
import { incrementWhatsAppMetric } from "../kv-store.js";

function endText(res, code, body) {
  res.statusCode = code;
  res.setHeader("content-type", "text/plain; charset=utf-8");
  res.end(body);
}

const AUTO =
  "Hi 👋 Welcome to Clip Services!\nHow can we help?\n\nReply with a number:\n1 - Track my order\n2 - Help with payment\n3 - Find a store near me\n4 - Speak to support";

export default async function handler(req, res) {
  const url = new URL(req.url || "/", "http://x");

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const v = String(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "").trim();
    if (mode === "subscribe" && v && token === v && challenge) {
      return endText(res, 200, challenge);
    }
    return endText(res, 403, "Forbidden");
  }

  if (req.method !== "POST") {
    return endText(res, 405, "Method Not Allowed");
  }

  let body;
  try {
    if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
      body = req.body;
    } else {
      const raw = await new Promise((resolve, reject) => {
        const c = [];
        let n = 0;
        req.on("data", (x) => {
          n += x.length;
          if (n > 2 * 1024 * 1024) {
            reject(new Error("too large"));
            req.destroy();
            return;
          }
          c.push(x);
        });
        req.on("end", () => resolve(JSON.parse(Buffer.concat(c).toString("utf8") || "{}")));
        req.on("error", reject);
      });
      body = raw;
    }
  } catch {
    res.statusCode = 400;
    return res.end("bad json");
  }

  const businessDigits = String(process.env.CLIP_WHATSAPP_E164 || "447487588706").replace(/\D/g, "");

  try {
    const entries = body?.entry || [];
    for (const ent of entries) {
      const changes = ent?.changes || [];
      for (const ch of changes) {
        const vals = ch?.value;
        const messages = vals?.messages || [];
        for (const m of messages) {
          if (m?.type !== "text" && m?.type !== "button") continue;
          const from = toWhatsAppDigits(m?.from);
          if (!from) continue;
          if (from === businessDigits) continue;
          if (!isWhatsAppApiConfigured()) continue;
          void sendWhatsAppText(from, AUTO, { type: "inbound_autoreply", skipMetric: true });
          void incrementWhatsAppMetric("inbound_autoreply_sent", 1);
        }
      }
    }
  } catch (e) {
    console.error("WA_WEBHOOK", e);
  }

  res.statusCode = 200;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ ok: true }));
}
