// Shared helpers for the guess page and the reveal page.
(function () {
  const { resolve, fold } = window.BreedPicker;

  // One consistent label per breed: Embark's name when it's on the list or a known nickname.
  function normalizeBreed(raw) {
    const s = String(raw || "").trim().replace(/\s+/g, " ");
    if (!s) return "";
    return resolve(s) || s;
  }

  // Score = how much of the real breakdown the guess covers (0–100).
  // For each breed, you earn the smaller of your % and the real %.
  function scoreGuess(guessBreeds, actual) {
    const real = new Map(actual.map((a) => [fold(normalizeBreed(a.breed)), a.pct]));
    let score = 0;
    for (const g of guessBreeds) {
      const r = real.get(fold(normalizeBreed(g.breed)));
      if (r) score += Math.min(r, g.pct);
    }
    return Math.round(score);
  }

  // Aggregate stats across all guesses.
  function summarize(guesses) {
    const n = guesses.length;
    const by = new Map();
    const firstPicks = new Map();
    for (const g of guesses) {
      (g.breeds || []).forEach((b, i) => {
        const name = normalizeBreed(b.breed);
        if (!name) return;
        const e = by.get(name) || { breed: name, people: 0, totalPct: 0 };
        e.people += 1;
        e.totalPct += Number(b.pct) || 0;
        by.set(name, e);
        if (i === 0) firstPicks.set(name, (firstPicks.get(name) || 0) + 1);
      });
    }
    const breeds = [...by.values()].map((e) => ({
      breed: e.breed,
      people: e.people,
      share: n ? e.totalPct / n : 0,        // crowd's average % for this breed
      avgWhenPicked: e.totalPct / e.people, // average % among people who picked it
    })).sort((a, b) => b.share - a.share);
    const topFirst = [...firstPicks.entries()].sort((a, b) => b[1] - a[1])[0] || null;
    const avgNamed = n ? guesses.reduce((s, g) => s + (g.breeds || []).reduce((t, b) => t + (Number(b.pct) || 0), 0), 0) / n : 0;
    return { n, breeds, topFirst, distinct: breeds.length, avgNamed };
  }

  function el(tag, attrs, ...kids) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") node.className = v;
      else if (k === "style") node.setAttribute("style", v);
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) node.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      node.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return node;
  }

  function fmtPct(x) {
    return (Math.round(x * 10) / 10).toString().replace(/\.0$/, "") + "%";
  }

  function timeAgo(iso) {
    const s = Math.max(1, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "just now";
    const m = s / 60; if (m < 60) return Math.floor(m) + "m ago";
    const h = m / 60; if (h < 24) return Math.floor(h) + "h ago";
    return Math.floor(h / 24) + "d ago";
  }

  // Fixed order of segment colors for a guess's breakdown (1st, 2nd, 3rd, rest).
  const SEG = ["var(--seg-1)", "var(--seg-2)", "var(--seg-3)"];

  function compositionBar(breeds) {
    const bar = el("div", { class: "comp", role: "img",
      "aria-label": breeds.map((b) => b.breed + " " + b.pct + "%").join(", ") || "No breeds yet" });
    let total = 0;
    breeds.forEach((b, i) => {
      if (!(b.pct > 0)) return;
      total += b.pct;
      bar.append(el("span", { class: "seg", style: `flex-basis:${b.pct}%;background:${SEG[i]}`, title: `${b.breed || "Breed " + (i + 1)}: ${b.pct}%` }));
    });
    if (total < 100) bar.append(el("span", { class: "seg rest", style: `flex-basis:${100 - total}%`, title: `Everything else: ${100 - total}%` }));
    return bar;
  }

  window.Common = { normalizeBreed, scoreGuess, summarize, el, fmtPct, timeAgo, compositionBar, SEG };
})();
