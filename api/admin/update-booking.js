import { endJson, readBody, requireAdmin } from "./_utils.js";
import { getBookingByRef, updateBookingStatus } from "../../lib/kv-store.js";
import { notifyBookingStatusCustomer } from "../../lib/notify.js";

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
  const allowed = new Set(["new", "awaiting_payment", "paid", "confirmed", "completed", "cancelled"]);
  if (!ref) return endJson(res, 400, { ok: false, error: "Missing ref" });
  if (!allowed.has(status)) return endJson(res, 400, { ok: false, error: "Invalid status" });

  try {
    const before = await getBookingByRef(ref);
    const updated = await updateBookingStatus(ref, status);
    if (!updated) return endJson(res, 404, { ok: false, error: "Booking not found" });
    const notifyCustomer =
      before &&
      before.status !== status &&
      ["confirmed", "completed", "cancelled", "paid"].includes(status);
    if (notifyCustomer) {
      const booking = await getBookingByRef(ref);
      if (booking) void notifyBookingStatusCustomer(booking, status).catch((e) => console.error("NOTIFY_STATUS", e));
    }
    return endJson(res, 200, { ok: true });
  } catch (e) {
    console.error("ADMIN_UPDATE_BOOKING_ERROR", e);
    return endJson(res, 500, { ok: false, error: "Failed to update" });
  }
}
