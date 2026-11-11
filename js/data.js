// Guesses live in my Google Sheet, through the Apps Script in google-sheet-script.gs.
(function () {
  const SHEET_URL = "https://script.google.com/macros/s/AKfycbxusLB1ev-fFUznml0lTr3IoiFGxNHuYk0Lt2907gauJyAm7wbg7jHWhZ6lyuqjJRs/exec";

  async function listGuesses() {
    let res;
    try { res = await fetch(SHEET_URL + "?t=" + Date.now()); }
    catch { throw new Error("Couldn't load guesses. Check your connection and try again."); }
    const body = await res.json().catch(() => null);
    if (!res.ok || !body || !body.ok) throw new Error("Couldn't load guesses. Try again in a moment.");
    return body.guesses;
  }

  async function addGuess(guess) {
    // Sent as plain text so the browser skips the CORS preflight, which Apps Script can't answer.
    let res;
    try { res = await fetch(SHEET_URL, { method: "POST", body: JSON.stringify({ name: guess.name, breeds: guess.breeds }) }); }
    catch { throw new Error("Couldn't save your guess. Check your connection and try again."); }
    const body = await res.json().catch(() => null);
    if (!body || !body.ok) throw new Error((body && body.error) || "Couldn't save your guess. Try again in a moment.");
  }

  window.GuessStore = { listGuesses, addGuess };
})();
