/**
 * Optional SMS via Twilio. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM (+44...).
 */

function toE164Uk(digits) {
  const d = String(digits || "").replace(/\D/g, "");
  if (d.length >= 10 && d.length <= 11 && d.startsWith("0")) return `+44${d.slice(1)}`;
  if (d.length >= 12 && d.startsWith("44")) return `+${d}`;
  if (d.length >= 10) return `+${d}`;
  return "";
}

export async function sendTransactionalSms(toRaw, body) {
  const sid = String(process.env.TWILIO_ACCOUNT_SID || "").trim();
  const token = String(process.env.TWILIO_AUTH_TOKEN || "").trim();
  const from = String(process.env.TWILIO_SMS_FROM || "").trim();
  const text = String(body || "").trim().slice(0, 640);
  const to = String(toRaw || "").trim().startsWith("+") ? String(toRaw).trim() : toE164Uk(toRaw);
  if (!sid || !token || !from || !to || !text) {
    return { ok: false, skipped: true };
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const params = new URLSearchParams({ To: to, From: from, Body: text });
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      console.error("SMS_TWILIO", r.status, errText.slice(0, 200));
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error("SMS_SEND", e?.message || e);
    return { ok: false };
  }
}
