// Type-to-search breed picker. People type, then tap or arrow+Enter a breed from Embark's list.
// Anything not on the list can still be used through the "Not on the list" option.
(function () {
  const BREEDS = window.BREEDS || [];
  const ALIASES = window.BREED_ALIASES || {};
  const MAX = 8;

  const fold = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

  const index = BREEDS.map((name) => ({ name, f: fold(name), words: fold(name).split(" ") }));
  const byFold = new Map(index.map((b) => [b.f, b.name]));
  const aliasFold = Object.entries(ALIASES).map(([k, v]) => [fold(k), v]);

  // Exact name or nickname -> Embark name, else null.
  function resolve(text) {
    const f = fold(text);
    if (!f) return null;
    if (byFold.has(f)) return byFold.get(f);
    const a = aliasFold.find(([k]) => k === f);
    return a ? a[1] : null;
  }

  function search(text) {
    const q = fold(text);
    if (!q) return [];
    const qw = q.split(" ");
    const scores = new Map();
    const put = (name, s) => { if (!scores.has(name) || scores.get(name) > s) scores.set(name, s); };
    for (const b of index) {
      if (b.f === q) put(b.name, 0);
      else if (b.f.startsWith(q)) put(b.name, 1);
      else if (qw.every((w) => b.words.some((bw) => bw.startsWith(w)))) put(b.name, 2);
      else if (q.length >= 4 && b.f.includes(q)) put(b.name, 3);
    }
    for (const [k, v] of aliasFold) {
      if (k === q) put(v, 0.5);
      else if (k.startsWith(q)) put(v, 1.5);
    }
    return [...scores.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0])).slice(0, MAX).map((e) => e[0]);
  }


  function create({ id, placeholder, label, onChange }) {
    const listId = id + "-list";
    const wrap = document.createElement("div");
    wrap.className = "picker";
    const input = document.createElement("input");
    Object.assign(input, { type: "text", id, placeholder: placeholder || "Start typing a breed", autocomplete: "off", spellcheck: false });
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", listId);
    input.setAttribute("maxlength", "60");
    if (label) input.setAttribute("aria-label", label);
    const list = document.createElement("ul");
    list.id = listId;
    list.className = "picker-list";
    list.setAttribute("role", "listbox");
    list.hidden = true;
    const note = document.createElement("span");
    note.className = "picker-note";
    note.hidden = true;
    wrap.append(input, list, note);

    let value = null;     // the chosen breed name, or null
    let custom = false;   // chosen through "Not on the list"
    let options = [];     // [{name, custom}]
    let active = -1;

    function setState() {
      wrap.classList.toggle("chosen", Boolean(value));
      note.hidden = !custom;
      note.textContent = custom ? "Not on Embark's list, so it can only score if Embark reports this exact name." : "";
    }

    function close() {
      list.hidden = true;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      active = -1;
    }

    function render() {
      const text = input.value.trim();
      const names = search(text);
      options = names.map((name) => ({ name, custom: false }));
      if (text && !resolve(text)) options.push({ name: text.replace(/\s+/g, " ").slice(0, 60), custom: true });
      list.replaceChildren(...options.map((o, i) => {
        const li = document.createElement("li");
        li.id = `${id}-opt-${i}`;
        li.setAttribute("role", "option");
        li.className = o.custom ? "other" : "";
        if (o.custom) {
          li.append("Not on the list? Use ");
          const b = document.createElement("b"); b.textContent = `“${o.name}”`; li.append(b);
        } else {
          li.textContent = o.name;
        }
        li.addEventListener("pointerdown", (e) => e.preventDefault()); // keep focus in the input
        li.addEventListener("click", () => choose(i));
        return li;
      }));
      if (!names.length && text) {
        const li = document.createElement("li");
        li.className = "empty"; li.textContent = "No Embark breed matches that.";
        list.prepend(li);
      }
      const open = options.length > 0;
      list.hidden = !open;
      input.setAttribute("aria-expanded", String(open));
      highlight(names.length ? 0 : -1);
    }

    function highlight(i) {
      active = i;
      [...list.querySelectorAll('[role="option"]')].forEach((li, j) => li.classList.toggle("active", j === i));
      if (i >= 0) {
        input.setAttribute("aria-activedescendant", `${id}-opt-${i}`);
        const li = document.getElementById(`${id}-opt-${i}`);
        if (li) li.scrollIntoView({ block: "nearest" });
      } else input.removeAttribute("aria-activedescendant");
    }

    function choose(i) {
      const o = options[i];
      if (!o) return;
      value = o.name; custom = o.custom;
      input.value = o.name;
      close(); setState();
      onChange && onChange();
    }

    input.addEventListener("input", () => {
      const exact = resolve(input.value);
      value = exact; custom = false;
      setState(); render();
      onChange && onChange();
    });
    input.addEventListener("focus", () => { if (!value && input.value.trim()) render(); });
    input.addEventListener("blur", () => {
      const exact = resolve(input.value);
      if (exact && !custom) { value = exact; input.value = exact; setState(); onChange && onChange(); }
      close();
    });
    input.addEventListener("keydown", (e) => {
      if (list.hidden) { if (e.key === "ArrowDown" && input.value.trim()) { render(); e.preventDefault(); } return; }
      if (e.key === "ArrowDown") { e.preventDefault(); highlight(Math.min(active + 1, options.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); highlight(Math.max(active - 1, 0)); }
      else if (e.key === "Enter") { if (active >= 0) { e.preventDefault(); choose(active); } }
      else if (e.key === "Escape") { close(); }
    });

    return {
      el: wrap,
      input,
      get value() { return value; },
      get text() { return input.value.trim(); },
      clear() { value = null; custom = false; input.value = ""; close(); setState(); },
    };
  }

  window.BreedPicker = { create, resolve, fold };
})();
