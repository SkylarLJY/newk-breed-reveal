/**
 * @OnlyCurrentDoc  Limits this script's access to the one sheet it's attached to.
 */

// Apps Script behind my Gnocchi guesses Google Sheet (Extensions -> Apps Script).
// Deployed as a web app: Execute as Me, access Anyone. Its /exec URL is in js/data.js.
// After editing, redeploy with Deploy -> Manage deployments -> Edit -> New version to keep the same URL.

const SHEET_NAME = "Guesses";
const MAX_ROWS = 500; // stops runaway spam

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(SHEET_NAME);
  if (!s) {
    s = ss.insertSheet(SHEET_NAME);
    s.appendRow(["Time", "Name", "Breed 1", "% 1", "Breed 2", "% 2", "Breed 3", "% 3"]);
    s.setFrozenRows(1);
  }
  // Sheets likes to auto-format the % columns as dates (they sit next to a timestamp),
  // which turns 50 into "Feb 18, 1900". Keep them as plain numbers.
  ["D:D", "F:F", "H:H"].forEach((a) => s.getRange(a).setNumberFormat("0"));
  return s;
}

// A % cell read back as a Date is a day count since Sheets' epoch (Dec 30, 1899); undo that.
const SHEETS_EPOCH = Date.UTC(1899, 11, 30);
function pct_(v) {
  if (v instanceof Date) return Math.round((Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()) - SHEETS_EPOCH) / 86400000);
  return Number(v) || 0;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Stops a cell from being read as a formula.
function safe_(v) {
  const s = String(v == null ? "" : v).trim();
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

// GET: all guesses, newest first.
function doGet() {
  const rows = sheet_().getDataRange().getValues().slice(1);
  const guesses = rows.filter((r) => r[1]).map((r) => {
    const breeds = [];
    for (let i = 2; i < 8; i += 2) {
      if (r[i]) breeds.push({ breed: String(r[i]).replace(/^'/, ""), pct: pct_(r[i + 1]) });
    }
    return { created_at: new Date(r[0]).toISOString(), name: String(r[1]).replace(/^'/, ""), breeds };
  });
  guesses.reverse();
  return json_({ ok: true, guesses });
}

// POST: add one guess, or an RSVP when type is "rsvp".
function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: "Bad request." }); }
  if (d.type === "rsvp") return rsvp_(d);

  const name = String(d.name || "").trim().slice(0, 40);
  const breeds = Array.isArray(d.breeds) ? d.breeds.slice(0, 3) : [];
  if (!name) return json_({ ok: false, error: "Add your name." });
  if (!breeds.length) return json_({ ok: false, error: "Enter at least one breed." });
  let total = 0;
  for (const b of breeds) {
    const pct = Math.round(Number(b.pct));
    if (!String(b.breed || "").trim() || !(pct >= 1 && pct <= 100)) return json_({ ok: false, error: "Each breed needs a name and a % from 1 to 100." });
    total += pct;
  }
  if (total > 100) return json_({ ok: false, error: "Percentages add up to more than 100%." });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const s = sheet_();
    if (s.getLastRow() > MAX_ROWS) return json_({ ok: false, error: "This guessing game is full." });
    const row = [new Date(), safe_(name)];
    for (let i = 0; i < 3; i++) {
      const b = breeds[i];
      row.push(b ? safe_(String(b.breed).slice(0, 50)) : "", b ? Math.round(Number(b.pct)) : "");
    }
    s.appendRow(row);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}

// RSVPs for the reveal party live in their own tab. They are never returned by doGet,
// so contact details stay private to the sheet's owner.
const RSVP_SHEET = "RSVPs";
const RSVP_ANSWERS = { yes: "Yes", maybe: "Maybe", no: "No" };

function rsvpSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(RSVP_SHEET);
  if (!s) {
    s = ss.insertSheet(RSVP_SHEET);
    s.appendRow(["Updated", "Name", "Coming?", "Best way to reach them"]);
    s.setFrozenRows(1);
  }
  return s;
}

function rsvp_(d) {
  const name = String(d.name || "").trim().slice(0, 40);
  const answer = RSVP_ANSWERS[String(d.answer || "")];
  const contact = String(d.contact || "").trim().slice(0, 100);
  if (!name) return json_({ ok: false, error: "Add your name." });
  if (!answer) return json_({ ok: false, error: "Pick yes, maybe or no." });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const s = rsvpSheet_();
    const row = [new Date(), safe_(name), answer, safe_(contact)];
    // One row per name: answering again updates it.
    const names = s.getLastRow() > 1 ? s.getRange(2, 2, s.getLastRow() - 1, 1).getValues() : [];
    const i = names.findIndex((r) => String(r[0]).replace(/^'/, "").trim().toLowerCase() === name.toLowerCase());
    if (i >= 0) s.getRange(i + 2, 1, 1, 4).setValues([row]);
    else if (s.getLastRow() > MAX_ROWS) return json_({ ok: false, error: "The RSVP list is full." });
    else s.appendRow(row);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}
