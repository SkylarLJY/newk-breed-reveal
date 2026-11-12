(function () {
  const { el, normalizeBreed, summarize, fmtPct, timeAgo, compositionBar, SEG } = window.Common;
  const store = window.GuessStore;
  const MINE_KEY = "breed-guess-mine";

  const $ = (id) => document.getElementById(id);

  // ---- Photos of Gnocchi --------------------------------------------------
  const PHOTOS = [
    { src: "photos/gnocchi-1.jpg", alt: "Gnocchi sitting on a garden path, harness on, mouth open" },
    { src: "photos/gnocchi-2.jpg", alt: "Gnocchi asleep on a rug next to the couch" },
    { src: "photos/gnocchi-3.jpg", alt: "Gnocchi digging in the sand at the beach" },
    { src: "photos/gnocchi-4.jpg", alt: "Gnocchi sniffing in the bushes at night" },
    { src: "photos/gnocchi-5.jpg", alt: "Gnocchi in a yellow raincoat on a rainy night" },
  ];
  (function renderGallery() {
    const g = $("gallery");
    const main = el("img", { src: PHOTOS[0].src, alt: PHOTOS[0].alt });
    const thumbs = el("div", { class: "thumbs" });
    PHOTOS.forEach((p, i) => {
      const b = el("button", { type: "button", "aria-label": `Show photo ${i + 1}`, "aria-current": i === 0 ? "true" : "false",
        onclick: () => {
          main.src = p.src; main.alt = p.alt;
          thumbs.querySelectorAll("button").forEach((x) => x.setAttribute("aria-current", x === b ? "true" : "false"));
        } }, el("img", { src: p.src, alt: "" }));
      thumbs.append(b);
    });
    g.prepend(el("figure", { class: "polaroid" }, main), thumbs);
  })();

  // ---- Form ---------------------------------------------------------------
  // Numbered paw print in the breed's bar color.
  function pawDot(color, n) {
    const d = el("span", { class: "dot", "aria-hidden": "true", style: `color:${color}` });
    d.innerHTML = `<svg class="paw"><use href="#paw"/></svg><b>${n}</b>`;
    return d;
  }

  const defaults = [50, 30, 20];
  const rowsEl = $("breed-rows");
  const rows = [0, 1, 2].map((i) => {
    const breed = window.BreedPicker.create({ id: `breed-${i}`, label: `Breed ${i + 1}`, onChange: updatePreview,
      placeholder: i === 0 ? "Most likely breed" : i === 1 ? "Second breed (optional)" : "Third breed (optional)" });
    const pct = el("input", { type: "number", id: `pct-${i}`, min: "1", max: "100", step: "1", inputmode: "numeric",
      value: String(defaults[i]), "aria-label": `Breed ${i + 1} percent` });
    rowsEl.append(el("div", { class: "row" },
      pawDot(SEG[i], i + 1),
      breed.el,
      el("div", { class: "pct" }, pct, el("span", null, "%"))));
    pct.addEventListener("input", updatePreview);
    return { breed, pct };
  });

  function readForm() {
    return rows
      .filter((r) => r.breed.value)
      .map((r) => ({ breed: r.breed.value, pct: Math.round(Number(r.pct.value)) }));
  }

  function updatePreview() {
    const breeds = readForm();
    const total = breeds.reduce((s, b) => s + (b.pct || 0), 0);
    $("preview").replaceWith(Object.assign(compositionBar(breeds), { id: "preview" }));
    const tt = $("total-text");
    tt.textContent = `Total: ${total}%`;
    tt.className = total > 100 ? "bad" : "";
    $("rest-text").textContent = total > 100 ? "Over 100% — lower a number" : total < 100 ? `Everything else: ${100 - total}%` : "Adds up to 100%";
  }
  updatePreview();

  function validate(name, breeds) {
    if (!name) return "Add your name so I know whose guess this is.";
    const unpicked = rows.find((r) => r.breed.text && !r.breed.value);
    if (unpicked) return `Pick “${unpicked.breed.text}” from the list that appears as you type, or choose “Not on the list”.`;
    if (!breeds.length) return "Enter at least one breed.";
    const seen = new Set();
    for (const b of breeds) {
      if (!(b.pct >= 1 && b.pct <= 100)) return `Give ${b.breed} a percentage between 1 and 100.`;
      const k = b.breed.toLowerCase();
      if (seen.has(k)) return `${b.breed} is listed twice. Combine them into one row.`;
      seen.add(k);
    }
    const total = breeds.reduce((s, b) => s + b.pct, 0);
    if (total > 100) return `Your percentages add up to ${total}%. Bring them down to 100% or less.`;
    return "";
  }

  $("guess-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("name").value.trim();
    const breeds = readForm();
    const err = validate(name, breeds);
    $("form-error").textContent = err;
    if (err) return;
    const btn = $("submit");
    const label = btn.querySelector("span");
    btn.disabled = true; label.textContent = "Saving…";
    try {
      await store.addGuess({ name, breeds });
      const mine = { name, breeds };
      try { localStorage.setItem(MINE_KEY, JSON.stringify(mine)); } catch {}
      showDone(mine);
      loadStats();
    } catch (ex) {
      $("form-error").textContent = ex.message || "Couldn't save your guess. Try again.";
    } finally {
      btn.disabled = false; label.textContent = "Submit my guess";
    }
  });

  function showDone(mine) {
    $("guess-form").hidden = true;
    $("find-area").hidden = true;
    $("done").hidden = false;
    $("done-title").textContent = `Good guess, ${mine.name}! It's locked in.`;
    showRsvp();
    $("my-guess").replaceChildren(
      compositionBar(mine.breeds),
      el("p", { class: "muted", style: "margin-top:8px" },
        mine.breeds.map((b) => `${b.breed} ${b.pct}%`).join(" · ")));
  }

  $("again").addEventListener("click", () => {
    $("done").hidden = true;
    $("guess-form").hidden = false;
    $("find-area").hidden = false;
    rows.forEach((r, i) => { r.breed.clear(); r.pct.value = String(defaults[i]); });
    $("name").value = "";
    updatePreview();
    $("name").focus();
  });

  // ---- RSVP for the reveal party -------------------------------------------
  const RSVP_KEY = "breed-rsvp";
  const rsvpForm = $("rsvp-form");
  const answerInputs = [...rsvpForm.querySelectorAll('input[name="rsvp-answer"]')];
  const chosenAnswer = () => (answerInputs.find((i) => i.checked) || {}).value || "";

  function getRsvp() {
    try { return JSON.parse(localStorage.getItem(RSVP_KEY)); } catch { return null; }
  }

  function syncContactField() {
    const a = chosenAnswer();
    $("rsvp-contact-field").hidden = !(a === "yes" || a === "maybe");
  }
  answerInputs.forEach((i) => i.addEventListener("change", () => { $("rsvp-error").textContent = ""; syncContactField(); }));

  function showRsvp() {
    const saved = getRsvp();
    if (!saved) { rsvpForm.hidden = false; $("rsvp-done").hidden = true; return; }
    const where = saved.contact ? ` at ${saved.contact}` : "";
    $("rsvp-done-text").textContent =
      saved.answer === "yes" ? `You're on the list! I'll send the details${where}.` :
      saved.answer === "maybe" ? `Got it. I'll keep you posted${where}.` :
      "No worries, thanks for letting me know.";
    rsvpForm.hidden = true;
    $("rsvp-done").hidden = false;
  }

  $("rsvp-change").addEventListener("click", () => {
    const saved = getRsvp() || {};
    answerInputs.forEach((i) => { i.checked = i.value === saved.answer; });
    $("rsvp-contact").value = saved.contact || "";
    syncContactField();
    rsvpForm.hidden = false;
    $("rsvp-done").hidden = true;
  });

  rsvpForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const answer = chosenAnswer();
    const contact = answer === "no" ? "" : $("rsvp-contact").value.trim();
    const mine = getMine();
    let err = "";
    if (!answer) err = "Pick one: I'm in, Maybe, or Can't make it.";
    else if (answer !== "no" && !contact) err = "Add a way to reach you so I can send you the details.";
    $("rsvp-error").textContent = err;
    if (err || !mine) return;
    const btn = $("rsvp-submit"), label = btn.querySelector("span");
    btn.disabled = true; label.textContent = "Sending…";
    try {
      await store.addRsvp({ name: mine.name, answer, contact });
      try { localStorage.setItem(RSVP_KEY, JSON.stringify({ answer, contact })); } catch {}
      showRsvp();
    } catch (ex) {
      $("rsvp-error").textContent = ex.message;
    } finally {
      btn.disabled = false; label.textContent = "Send RSVP";
    }
  });

  // ---- Stats --------------------------------------------------------------
  function getMine() {
    try { return JSON.parse(localStorage.getItem(MINE_KEY)); } catch { return null; }
  }

  async function loadStats() {
    const body = $("stats-body");
    if (!getMine()) return; // stays locked until this person has guessed
    $("refresh").hidden = false;
    body.replaceChildren(el("p", { class: "muted" }, "Loading guesses…"));
    let guesses;
    try { guesses = await store.listGuesses(); }
    catch (ex) { body.replaceChildren(el("p", { class: "error" }, ex.message)); return; }
    renderStats(guesses);
  }

  function renderStats(guesses) {
    const s = summarize(guesses);
    const body = $("stats-body");
    if (!s.n) { body.replaceChildren(el("p", { class: "muted" }, "No guesses yet.")); return; }

    const tiles = el("div", { class: "tiles" },
      el("div", { class: "tile" }, el("span", { class: "eyebrow" }, "Guesses"), el("span", { class: "big num" }, s.n)),
      el("div", { class: "tile" }, el("span", { class: "eyebrow" }, "Breeds named"), el("span", { class: "big num" }, s.distinct)),
      el("div", { class: "tile" }, el("span", { class: "eyebrow" }, "Top #1 pick"),
        el("span", { class: "big small" }, s.topFirst ? s.topFirst[0] : "—"),
        s.topFirst ? el("span", { class: "muted", style: "font-size:.82rem" }, `${s.topFirst[1]} of ${s.n} people`) : null));

    const top = s.breeds.slice(0, 8);
    const bars = el("div", { class: "bars" }, top.map((b) =>
      el("div", { class: "bar-row", title: `${b.breed}: crowd average ${fmtPct(b.share)}; picked by ${b.people}; ${fmtPct(b.avgWhenPicked)} on average when picked` },
        el("span", { class: "name" }, b.breed),
        el("span", { class: "val" }, fmtPct(b.share)),
        el("div", { class: "track" }, el("div", { class: "fill", style: `width:${Math.min(b.share, 100)}%` })),
        el("span", { class: "sub" }, `Picked by ${b.people} of ${s.n} · ${fmtPct(b.avgWhenPicked)} when picked`))));
    const rest = Math.max(0, 100 - s.breeds.reduce((t, b) => t + b.share, 0));
    const blendNote = el("p", { class: "muted", style: "font-size:.85rem" },
      `Average breakdown across all guesses. "Everything else" averages ${fmtPct(rest)}.` +
      (s.breeds.length > 8 ? ` Showing the top 8 of ${s.breeds.length} breeds.` : ""));

    const feed = el("ul", { class: "feed" }, guesses.slice(0, 25).map((g) =>
      el("li", null,
        el("div", { class: "who" }, el("b", null, g.name), el("span", { class: "muted", style: "font-size:.85rem" }, timeAgo(g.created_at))),
        compositionBar(g.breeds),
        el("div", { class: "picks" }, g.breeds.flatMap((b, i) => [
          i ? " · " : "", normalizeBreed(b.breed), " ", el("span", { class: "num" }, b.pct + "%")])))));

    body.replaceChildren(el("div", { class: "stats" },
      tiles,
      el("div", { class: "rows", style: "gap:14px" }, el("h3", null, "The pack's average"), bars, blendNote),
      el("div", { class: "rows", style: "gap:14px" }, el("h3", null, "Latest guesses"), feed)));
  }

  $("refresh").addEventListener("click", loadStats);
  $("refresh").hidden = true;

  // ---- Find a guess made on another device ---------------------------------
  $("find-toggle").addEventListener("click", () => {
    const box = $("find-box");
    box.hidden = !box.hidden;
    if (!box.hidden) $("find-name").focus();
  });

  $("find-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = $("find-name").value.trim().toLowerCase();
    const msg = $("find-msg");
    if (!q) { msg.textContent = "Type the name you used when you guessed."; return; }
    msg.textContent = "Looking…";
    let guesses;
    try { guesses = await store.listGuesses(); }
    catch (ex) { msg.textContent = ex.message; return; }
    const hit = guesses.find((g) => String(g.name).trim().toLowerCase() === q); // newest first
    if (!hit) { msg.textContent = "No guess under that name. Check the spelling, or make a guess above."; return; }
    const mine = { name: hit.name, breeds: hit.breeds.map((b) => ({ breed: normalizeBreed(b.breed), pct: b.pct })) };
    try { localStorage.setItem(MINE_KEY, JSON.stringify(mine)); } catch {}
    msg.textContent = "";
    $("find-box").hidden = true;
    showDone(mine);
    renderStats(guesses);
    $("refresh").hidden = false;
    $("guess-card").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const mine = getMine();
  if (mine) { showDone(mine); loadStats(); }
})();
