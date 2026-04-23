/**
 * Meta WhatsApp Cloud API (Graph) — send text messages.
 * Env: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID (from Meta app / phone number).
 * Business display number (e.g. +44 7487 588706) is not the same as phone number ID.
 */
import { incrementWhatsAppMetric } from "./kv-store.js";

const GRAPH = "https://graph.facebook.com/v21.0";

export function isWhatsAppApiConfigured() {
  return Boolean(
    String(process.env.WHATSAPP_ACCESS_TOKEN || "").trim() &&
      String(process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim()
  );
}

/** E.164 digits only, no + (e.g. 447487588706) */
export function toWhatsAppDigits(phone) {
  let d = String(phone || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("0")) d = `44${d.slice(1)}`;
  else if (d.length === 10 && d.startsWith("7")) d = `44${d}`;
  else if (d.length >= 9 && d.length <= 10 && !d.startsWith("44")) d = `44${d}`;
  return d.length >= 10 && d.length <= 15 ? d : "";
}

/**
 * @param {string} toDigits - international digits
 * @param {string} body - plain text, keep short
 * @param {{ type?: string, skipMetric?: boolean }} [opts]
 */
export async function sendWhatsAppText(toDigits, body, opts = {}) {
  const to = String(toDigits || "").replace(/\D/g, "");
  const text = String(body || "").trim();
  if (!to || !text) return { ok: false, error: "missing_to_or_body" };
  if (!isWhatsAppApiConfigured()) {
    console.warn("WA: WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set — message not sent");
    return { ok: false, error: "not_configured" };
  }
  const token = String(process.env.WHATSAPP_ACCESS_TOKEN || "").trim();
  const phoneId = String(process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim();
  const url = `${GRAPH}/${phoneId}/messages`;
  const msgType = String(opts.type || "outbound").slice(0, 48);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: true, body: text.slice(0, 4000) },
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("WA_SEND", res.status, JSON.stringify(j).slice(0, 500));
      return { ok: false, error: j?.error?.message || `http_${res.status}` };
    }
    if (!opts.skipMetric) {
      void incrementWhatsAppMetric("total", 1);
      if (msgType) void incrementWhatsAppMetric(String(msgType).replace(/[^\w-]/g, "").slice(0, 48), 1);
    }
    return { ok: true, id: j?.messages?.[0]?.id };
  } catch (e) {
    console.error("WA_SEND_EX", e?.message);
    return { ok: false, error: e?.message || "fetch_failed" };
  }
}
