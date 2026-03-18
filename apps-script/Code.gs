/**
 * Dimshaircare Google Sheets Admin API (free)
 *
 * 1) Create a Google Sheet with two tabs:
 *    - bookings
 *    - contacts
 *
 * 2) In Apps Script, paste this file as Code.gs
 * 3) Set script properties:
 *    - ADMIN_TOKEN (same value as Vercel ADMIN_TOKEN)
 *
 * 4) Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 *
 * The web app URL becomes GOOGLE_SHEETS_ADMIN_API_URL in Vercel.
 */

const SHEET_BOOKINGS = "bookings";
const SHEET_CONTACTS = "contacts";

function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents ? e.postData.contents : "";
    const payload = body ? JSON.parse(body) : {};

    // Auth
    const expected = PropertiesService.getScriptProperties().getProperty("ADMIN_TOKEN");
    const provided = String(payload.token || "");
    if (!expected) return json_(500, { ok: false, error: "ADMIN_TOKEN not set in Script Properties" });
    if (!provided || provided !== expected) return json_(401, { ok: false, error: "Unauthorized" });

    const action = String(payload.action || "");
    switch (action) {
      case "listBookings":
        return listBookings_();
      case "listContacts":
        return listContacts_();
      case "updateBookingStatus":
        return updateBookingStatus_(payload);
      default:
        return json_(400, { ok: false, error: "Unknown action" });
    }
  } catch (err) {
    return json_(500, { ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function listBookings_() {
  const sh = getOrInitBookings_();
  const rows = sh.getDataRange().getValues();
  if (rows.length <= 1) return json_(200, { ok: true, items: [] });
  const headers = rows[0].map(String);

  const items = [];
  for (let i = 1; i < rows.length; i++) {
    const obj = {};
    for (let c = 0; c < headers.length; c++) obj[headers[c]] = rows[i][c];
    items.push(obj);
  }
  // newest first if createdAt present
  items.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return json_(200, { ok: true, items: items });
}

function listContacts_() {
  const sh = getOrInitContacts_();
  const rows = sh.getDataRange().getValues();
  if (rows.length <= 1) return json_(200, { ok: true, items: [] });
  const headers = rows[0].map(String);

  const items = [];
  for (let i = 1; i < rows.length; i++) {
    const obj = {};
    for (let c = 0; c < headers.length; c++) obj[headers[c]] = rows[i][c];
    items.push(obj);
  }
  items.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return json_(200, { ok: true, items: items });
}

function updateBookingStatus_(payload) {
  const ref = String(payload.ref || "").trim();
  const status = String(payload.status || "").trim();
  if (!ref) return json_(400, { ok: false, error: "Missing ref" });
  const allowed = { new: true, confirmed: true, completed: true, cancelled: true };
  if (!allowed[status]) return json_(400, { ok: false, error: "Invalid status" });

  const sh = getOrInitBookings_();
  const range = sh.getDataRange();
  const values = range.getValues();
  const headers = values[0].map(String);
  const refIdx = headers.indexOf("ref");
  const statusIdx = headers.indexOf("status");
  if (refIdx === -1) return json_(500, { ok: false, error: "bookings sheet missing 'ref' column" });
  if (statusIdx === -1) return json_(500, { ok: false, error: "bookings sheet missing 'status' column" });

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][refIdx]) === ref) {
      sh.getRange(i + 1, statusIdx + 1).setValue(status);
      return json_(200, { ok: true });
    }
  }
  return json_(404, { ok: false, error: "Booking not found" });
}

function getOrInitBookings_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET_BOOKINGS);
  if (!sh) sh = ss.insertSheet(SHEET_BOOKINGS);
  const headers = [
    "ref",
    "createdAt",
    "status",
    "service",
    "price",
    "dur",
    "date",
    "time",
    "firstName",
    "lastName",
    "phone",
    "email",
    "notes"
  ];
  initHeaders_(sh, headers);
  return sh;
}

function getOrInitContacts_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET_CONTACTS);
  if (!sh) sh = ss.insertSheet(SHEET_CONTACTS);
  const headers = ["createdAt", "name", "email", "message"];
  initHeaders_(sh, headers);
  return sh;
}

function initHeaders_(sh, headers) {
  const range = sh.getRange(1, 1, 1, headers.length);
  const current = range.getValues()[0].map(String);
  const needs = current.join("|") !== headers.join("|");
  if (sh.getLastRow() === 0 || needs) {
    sh.clear();
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
}

function json_(status, obj) {
  const out = ContentService.createTextOutput(JSON.stringify(obj));
  out.setMimeType(ContentService.MimeType.JSON);
  // Apps Script doesn't let us set status code directly; we include it for debugging.
  // Vercel will treat non-200 as errors only if we do it there; this is fine.
  return out;
}

