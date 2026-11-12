// Guesses live in my Google Sheet, through the Apps Script in google-sheet-script.gs.
(function () {
  const SHEET_URL = "https://script.google.com/macros/s/AKfycbxusLB1ev-fFUznml0lTr3IoiFGxNHuYk0Lt2907gauJyAm7wbg7jHWhZ6lyuqjJRs/exec";

  async function listGuesses() {
    let res;
    try { res = await fetch(SHEET_URL + "?t=" + Date.now()); }
    catch { throw new Error("Couldn't load guesses. Check your connection and try again."); }
    const body = await res.json().catch(() => null);
    if (!res.ok || !body || !body.ok) throw new Error("Couldn't load guesses. Try again in a moment.");
    return body.guesses.map((g) => ({ ...g, breeds: (g.breeds || []).map((b) => ({ ...b, pct: fixPct(b.pct) })) }));
  }

  // Google Sheets sometimes stores a % as a date (50 -> Feb 18, 1900), which comes back as a
  // millisecond timestamp like -2204812800000. Turn it back into the day count it really is.
  const SHEETS_EPOCH = Date.UTC(1899, 11, 30);
  function fixPct(v) {
    const n = Number(v);
    if (n >= 0 && n <= 100) return n;
    if (Math.abs(n) > 1e9) {
      const days = Math.round((n - SHEETS_EPOCH) / 86400000);
      if (days >= 0 && days <= 100) return days;
    }
    return 0;
  }

  async function addGuess(guess) {
    // Sent as plain text so the browser skips the CORS preflight, which Apps Script can't answer.
    let res;
    try { res = await fetch(SHEET_URL, { method: "POST", body: JSON.stringify({ name: guess.name, breeds: guess.breeds }) }); }
    catch { throw new Error("Couldn't save your guess. Check your connection and try again."); }
    const body = await res.json().catch(() => null);
    if (!body || !body.ok) throw new Error((body && body.error) || "Couldn't save your guess. Try again in a moment.");
  }

  async function addRsvp({ name, answer, contact }) {
    let res;
    try { res = await fetch(SHEET_URL, { method: "POST", body: JSON.stringify({ type: "rsvp", name, answer, contact }) }); }
    catch { throw new Error("Couldn't send your RSVP. Check your connection and try again."); }
    const body = await res.json().catch(() => null);
    if (!body || !body.ok) throw new Error((body && body.error) || "Couldn't send your RSVP. Try again in a moment.");
  }

  window.GuessStore = { listGuesses, addGuess, addRsvp };
})();
