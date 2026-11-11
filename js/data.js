// Storage layer: a Google Sheet (via its Apps Script web app) when configured,
// otherwise localStorage (demo mode).
(function () {
  const cfg = window.APP_CONFIG || {};
  const LOCAL_KEY = "breed-guesses-demo";
  const remote = Boolean(cfg.SHEET_URL);

  function readLocal() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []; } catch { return []; }
  }

  async function listGuesses() {
    if (!remote) return readLocal();
    let res;
    try { res = await fetch(cfg.SHEET_URL + "?t=" + Date.now()); }
    catch { throw new Error("Couldn't reach the guess sheet. Check your connection and try again."); }
    const body = await res.json().catch(() => null);
    if (!res.ok || !body || !body.ok) throw new Error("Couldn't load guesses. Try again in a moment.");
    return body.guesses;
  }

  async function addGuess(guess) {
    const row = { name: guess.name, breeds: guess.breeds };
    if (!remote) {
      const all = readLocal();
      all.unshift(Object.assign({ created_at: new Date().toISOString() }, row));
      localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
      return;
    }
    // Sent as plain text so the browser doesn't need a CORS preflight, which Apps Script can't answer.
    let res;
    try { res = await fetch(cfg.SHEET_URL, { method: "POST", body: JSON.stringify(row) }); }
    catch { throw new Error("Couldn't reach the guess sheet. Check your connection and try again."); }
    const body = await res.json().catch(() => null);
    if (!body || !body.ok) throw new Error((body && body.error) || "Couldn't save your guess. Try again in a moment.");
  }

  window.GuessStore = { listGuesses, addGuess, isDemo: !remote };
})();
