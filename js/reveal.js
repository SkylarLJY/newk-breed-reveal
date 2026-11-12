(function () {
  const { el, normalizeBreed, scoreGuess, compositionBar } = window.Common;
  const $ = (id) => document.getElementById(id);

  const rowsEl = $("actual-rows");
  const rows = [];
  function addRow() {
    const i = rows.length;
    const breed = window.BreedPicker.create({ id: `actual-breed-${i}`, placeholder: "Breed", label: `Actual breed ${i + 1}`, onChange: preview });
    const pct = el("input", { type: "number", id: `actual-pct-${i}`, min: "0", max: "100", step: "0.1", inputmode: "decimal", placeholder: "0", "aria-label": `Actual breed ${i + 1} percent` });
    rowsEl.append(el("div", { class: "row" },
      (() => { const d = el("span", { class: "dot", "aria-hidden": "true", style: "color:var(--ink-3)" }); d.innerHTML = `<svg class="paw"><use href="#paw"/></svg><b>${i + 1}</b>`; return d; })(),
      breed.el, el("div", { class: "pct" }, pct, el("span", null, "%"))));
    pct.addEventListener("input", preview);
    rows.push({ breed, pct });
    if (rows.length >= 8) $("add-row").hidden = true;
  }
  for (let i = 0; i < 4; i++) addRow();
  $("add-row").addEventListener("click", () => { addRow(); rows[rows.length - 1].breed.input.focus(); });

  function readActual() {
    return rows.map((r) => ({ breed: r.breed.value || normalizeBreed(r.breed.text), pct: Number(r.pct.value) || 0 }))
      .filter((a) => a.breed && a.pct > 0);
  }

  function preview() {
    const a = readActual();
    const total = a.reduce((s, x) => s + x.pct, 0);
    // Real results can have many breeds; show the first three in color, the rest as "everything else".
    $("actual-preview").replaceWith(Object.assign(compositionBar(a.slice(0, 3)), { id: "actual-preview" }));
    $("actual-total").textContent = `Total entered: ${Math.round(total * 10) / 10}%`;
  }
  preview();

  $("score").addEventListener("click", async () => {
    const actual = readActual();
    const card = $("board-card");
    const board = $("board");
    card.hidden = false;
    if (!actual.length) { board.replaceChildren(el("li", null, el("span"), el("span", { class: "muted" }, "Enter at least one breed above first."), el("span"))); return; }
    board.replaceChildren(el("li", null, el("span"), el("span", { class: "muted" }, "Loading guesses…"), el("span")));
    let guesses;
    try { guesses = await window.GuessStore.listGuesses(); }
    catch (ex) { board.replaceChildren(el("li", null, el("span"), el("span", { class: "error" }, ex.message), el("span"))); return; }

    const scored = guesses.map((g) => {
      const breeds = (g.breeds || []).map((b) => ({ breed: normalizeBreed(b.breed), pct: Number(b.pct) || 0 }));
      return { name: g.name, breeds, score: scoreGuess(breeds, actual), at: g.created_at };
    }).sort((a, b) => b.score - a.score || new Date(a.at) - new Date(b.at)); // ties: earlier guess wins

    $("board-count").textContent = `${scored.length} guesses`;
    let lastScore = null, rank = 0;
    board.replaceChildren(...scored.map((g, i) => {
      if (g.score !== lastScore) { rank = i + 1; lastScore = g.score; }
      const real = new Set(actual.map((a) => a.breed.toLowerCase()));
      return el("li", null,
        el("span", { class: "rank" }, rank),
        el("div", { class: "rows", style: "gap:6px;min-width:0" },
          el("b", { style: "overflow-wrap:anywhere" }, g.name),
          compositionBar(g.breeds),
          el("span", { class: "picks" }, g.breeds.flatMap((b, j) => [
            j ? " · " : "",
            real.has(b.breed.toLowerCase()) ? el("strong", null, `${b.breed} ${b.pct}% ✓`) : `${b.breed} ${b.pct}%`]))),
        el("span", { class: "score num" }, g.score));
    }));
    if (!scored.length) board.replaceChildren(el("li", null, el("span"), el("span", { class: "muted" }, "No guesses yet."), el("span")));
  });
})();
