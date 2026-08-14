(() => {
  const STORAGE_KEY = "multimemos.workspace.v1";
  const DEFAULT_PANES = [
    { id: "reference", eyebrow: "REFERENCE", title: "返信元・素材", paragraphs: [""], fontOffset: -1, locked: false },
    { id: "draft-a", eyebrow: "DRAFT A", title: "AI案・参考", paragraphs: [""], fontOffset: -1, locked: false },
    { id: "draft-b", eyebrow: "DRAFT B", title: "作業文", paragraphs: [""], fontOffset: 1, locked: false },
    { id: "notes", eyebrow: "NOTES", title: "メモ", paragraphs: [""], fontOffset: -1, locked: false },
  ];
  const DEFAULT_WIDTHS = { 2: [50, 50], 3: [33.333, 33.334, 33.333], 4: [25, 25, 25, 25] };
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const toText = (paragraphs) => paragraphs.join("\n\n");
  const toParagraphs = (text) => text.replace(/\r\n?/g, "\n").split(/\n{2,}/);
  const countChars = (paragraphs) => toText(paragraphs).replace(/\s/g, "").length;
  const clone = (value) => JSON.parse(JSON.stringify(value));

  const load = () => {
    const fallback = { layout: 3, fontSize: 13, compact: false, panes: clone(DEFAULT_PANES), widths: clone(DEFAULT_WIDTHS) };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return fallback;
      const saved = JSON.parse(raw);
      return {
        layout: [2, 3, 4].includes(saved.layout) ? saved.layout : 3,
        fontSize: clamp(Number(saved.fontSize) || 13, 11, 18),
        compact: Boolean(saved.compact),
        widths: saved.widths || clone(DEFAULT_WIDTHS),
        panes: DEFAULT_PANES.map((base, i) => {
          const pane = saved.panes?.[i] || {};
          return {
            ...base,
            ...pane,
            paragraphs: Array.isArray(pane.paragraphs) && pane.paragraphs.length ? pane.paragraphs.map(String) : [""],
            fontOffset: clamp(Number(pane.fontOffset) || 0, -4, 6),
            locked: Boolean(pane.locked),
          };
        }),
      };
    } catch {
      return fallback;
    }
  };

  let state = load();
  let focusId = null;
  let mobileIndex = 0;
  let saveTimer = 0;
  const workspace = document.querySelector("#workspace");
  const template = document.querySelector("#paneTemplate");
  const app = document.querySelector(".app");
  const saveState = document.querySelector("#saveState");

  const visiblePanes = () => {
    if (focusId) return state.panes.filter((pane) => pane.id === focusId);
    return state.panes.slice(0, state.layout);
  };

  const saveSoon = () => {
    saveState.classList.add("saving");
    saveState.lastChild.textContent = " Saving…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      saveState.classList.remove("saving");
      saveState.lastChild.textContent = " Saved locally";
    }, 220);
  };

  const setPane = (id, patch) => {
    const pane = state.panes.find((item) => item.id === id);
    if (!pane) return;
    Object.assign(pane, patch);
    saveSoon();
  };

  const equalize = () => {
    state.widths[state.layout] = clone(DEFAULT_WIDTHS[state.layout]);
    saveSoon();
    render();
  };

  const updatePager = () => {
    const panes = visiblePanes();
    mobileIndex = clamp(mobileIndex, 0, Math.max(0, panes.length - 1));
    document.querySelector("#mobileCount").textContent = `${mobileIndex + 1} / ${panes.length}`;
    document.querySelector("#mobileTitle").textContent = panes[mobileIndex]?.title || "";
    document.querySelector("#mobilePrev").disabled = mobileIndex === 0;
    document.querySelector("#mobileNext").disabled = mobileIndex >= panes.length - 1;
  };

  const goMobile = (index) => {
    const panes = visiblePanes();
    mobileIndex = clamp(index, 0, panes.length - 1);
    workspace.scrollTo({ left: mobileIndex * workspace.clientWidth, behavior: "smooth" });
    updatePager();
  };

  const startResize = (index, event) => {
    if (focusId) return;
    event.preventDefault();
    const startX = event.clientX;
    const start = [...state.widths[state.layout]];
    const total = start[index] + start[index + 1];
    const min = state.layout === 4 ? 15 : 18;
    const width = workspace.getBoundingClientRect().width;
    const move = (e) => {
      const delta = ((e.clientX - startX) / width) * 100;
      const left = clamp(start[index] + delta, min, total - min);
      state.widths[state.layout][index] = left;
      state.widths[state.layout][index + 1] = total - left;
      workspace.style.gridTemplateColumns = state.widths[state.layout].map((n) => `${n}%`).join(" ");
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      saveSoon();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  };

  const render = () => {
    const panes = visiblePanes();
    workspace.innerHTML = "";
    workspace.style.gridTemplateColumns = focusId ? "minmax(0,1fr)" : state.widths[state.layout].map((n) => `${n}%`).join(" ");
    app.classList.toggle("compact", state.compact);
    document.querySelector("#fontValue").textContent = state.fontSize;
    document.querySelector("#compactToggle").classList.toggle("active", state.compact);
    document.querySelectorAll("[data-layout]").forEach((button) => button.classList.toggle("active", Number(button.dataset.layout) === state.layout && !focusId));

    panes.forEach((pane, index) => {
      const node = template.content.firstElementChild.cloneNode(true);
      const editor = node.querySelector(".memo-editor");
      const title = node.querySelector(".pane-title");
      const fontSize = clamp(state.fontSize + pane.fontOffset, 10, 20);
      node.dataset.id = pane.id;
      node.classList.toggle("reference", pane.locked);
      node.style.setProperty("--pane-font-size", `${fontSize}px`);
      node.querySelector(".pane-eyebrow").textContent = pane.eyebrow;
      title.value = pane.title;
      editor.value = toText(pane.paragraphs);
      editor.readOnly = pane.locked;
      editor.placeholder = index === 0 ? "返信元メールや参考文を貼り付ける…" : index === 1 ? "AIの提案や参考文を置く…" : "ここに文章を書く…";
      node.querySelector(".pane-font-value").textContent = fontSize;
      node.querySelector(".paragraph-count").textContent = `${pane.paragraphs.length} paragraphs`;
      node.querySelector(".char-count").textContent = `${countChars(pane.paragraphs).toLocaleString("ja-JP")} chars`;
      node.querySelector('[data-action="lock"]').classList.toggle("active", pane.locked);
      node.querySelector('[data-action="focus"]').textContent = focusId === pane.id ? "↙" : "↗";
      node.querySelector('[data-action="clear"]').disabled = pane.locked;

      title.addEventListener("input", () => { pane.title = title.value; saveSoon(); updatePager(); });
      editor.addEventListener("input", () => {
        pane.paragraphs = toParagraphs(editor.value);
        node.querySelector(".paragraph-count").textContent = `${pane.paragraphs.length} paragraphs`;
        node.querySelector(".char-count").textContent = `${countChars(pane.paragraphs).toLocaleString("ja-JP")} chars`;
        saveSoon();
      });

      node.querySelector('[data-action="lock"]').addEventListener("click", () => { pane.locked = !pane.locked; saveSoon(); render(); });
      node.querySelector('[data-action="smaller"]').addEventListener("click", () => { pane.fontOffset = clamp(pane.fontOffset - 1, -4, 6); saveSoon(); render(); });
      node.querySelector('[data-action="larger"]').addEventListener("click", () => { pane.fontOffset = clamp(pane.fontOffset + 1, -4, 6); saveSoon(); render(); });
      node.querySelector('[data-action="copy"]').addEventListener("click", async (event) => {
        try {
          await navigator.clipboard.writeText(toText(pane.paragraphs));
          event.currentTarget.textContent = "✓";
          setTimeout(() => { event.currentTarget.textContent = "⧉"; }, 900);
        } catch {}
      });
      node.querySelector('[data-action="focus"]').addEventListener("click", () => { focusId = focusId === pane.id ? null : pane.id; mobileIndex = 0; render(); });
      node.querySelector('[data-action="clear"]').addEventListener("click", () => {
        if (pane.locked) return;
        if (toText(pane.paragraphs).trim() && !confirm(`「${pane.title}」を空にしますか？`)) return;
        pane.paragraphs = [""];
        saveSoon();
        render();
      });
      const resize = node.querySelector(".resize-handle");
      if (focusId || index === panes.length - 1) resize.remove();
      else {
        resize.addEventListener("pointerdown", (event) => startResize(index, event));
        resize.addEventListener("dblclick", equalize);
      }
      workspace.appendChild(node);
    });
    updatePager();
  };

  document.querySelectorAll("[data-layout]").forEach((button) => button.addEventListener("click", () => {
    state.layout = Number(button.dataset.layout);
    focusId = null;
    mobileIndex = 0;
    saveSoon();
    render();
  }));
  document.querySelector("#fontDown").addEventListener("click", () => { state.fontSize = clamp(state.fontSize - 1, 11, 18); saveSoon(); render(); });
  document.querySelector("#fontUp").addEventListener("click", () => { state.fontSize = clamp(state.fontSize + 1, 11, 18); saveSoon(); render(); });
  document.querySelector("#compactToggle").addEventListener("click", () => { state.compact = !state.compact; saveSoon(); render(); });
  document.querySelector("#equalize").addEventListener("click", equalize);
  document.querySelector("#mobilePrev").addEventListener("click", () => goMobile(mobileIndex - 1));
  document.querySelector("#mobileNext").addEventListener("click", () => goMobile(mobileIndex + 1));
  workspace.addEventListener("scroll", () => {
    if (workspace.clientWidth && matchMedia("(max-width:800px)").matches) {
      mobileIndex = clamp(Math.round(workspace.scrollLeft / workspace.clientWidth), 0, visiblePanes().length - 1);
      updatePager();
    }
  }, { passive: true });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && focusId) { focusId = null; render(); return; }
    if (!event.altKey || event.ctrlKey || event.metaKey) return;
    const n = Number(event.key);
    const panes = visiblePanes();
    if (!Number.isInteger(n) || n < 1 || n > panes.length) return;
    event.preventDefault();
    const editor = workspace.querySelectorAll(".memo-editor")[n - 1];
    editor?.focus();
    if (matchMedia("(max-width:800px)").matches) goMobile(n - 1);
  });

  render();
})();
