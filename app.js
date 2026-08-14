(() => {
  const STORAGE_KEY = "multimemos.workspace.v1";
  const LEGACY_DEFAULT_TITLES = ["返信元・素材", "AI案・参考", "作業文", "メモ"];
  const DEFAULT_PANES = [
    { id: "reference", title: "欄1", paragraphs: [""], fontOffset: 0, locked: false },
    { id: "draft-a", title: "欄2", paragraphs: [""], fontOffset: 0, locked: false },
    { id: "draft-b", title: "欄3", paragraphs: [""], fontOffset: 0, locked: false },
    { id: "notes", title: "欄4", paragraphs: [""], fontOffset: 0, locked: false },
  ];
  const DEFAULT_WIDTHS = { 2: [50, 50], 3: [33.333, 33.334, 33.333], 4: [25, 25, 25, 25] };
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const toText = (paragraphs) => paragraphs.join("\n\n");
  const toParagraphs = (text) => text.replace(/\r\n?/g, "\n").split(/\n{2,}/);
  const countChars = (paragraphs) => toText(paragraphs).replace(/\s/g, "").length;
  const countParagraphs = (paragraphs) => (toText(paragraphs).trim() ? paragraphs.length : 0);

  const sanitizeWidths = (savedWidths) => {
    const result = clone(DEFAULT_WIDTHS);
    [2, 3, 4].forEach((layout) => {
      const candidate = savedWidths?.[layout];
      if (!Array.isArray(candidate) || candidate.length !== layout) return;
      const values = candidate.map(Number);
      if (values.some((value) => !Number.isFinite(value) || value <= 0)) return;
      const total = values.reduce((sum, value) => sum + value, 0);
      if (!total) return;
      result[layout] = values.map((value) => (value / total) * 100);
    });
    return result;
  };

  const migrateTitle = (savedTitle, index) => {
    const normalized = typeof savedTitle === "string" ? savedTitle.trim() : "";
    if (!normalized || normalized === LEGACY_DEFAULT_TITLES[index]) return DEFAULT_PANES[index].title;
    return normalized;
  };

  const load = () => {
    const fallback = {
      layout: 3,
      fontSize: 13,
      compact: false,
      panes: clone(DEFAULT_PANES),
      widths: clone(DEFAULT_WIDTHS),
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return fallback;
      const saved = JSON.parse(raw);

      return {
        layout: [2, 3, 4].includes(saved.layout) ? saved.layout : 3,
        fontSize: clamp(Number(saved.fontSize) || 13, 11, 18),
        compact: Boolean(saved.compact),
        widths: sanitizeWidths(saved.widths),
        panes: DEFAULT_PANES.map((base, index) => {
          const pane = saved.panes?.[index] || {};
          return {
            ...base,
            title: migrateTitle(pane.title, index),
            paragraphs:
              Array.isArray(pane.paragraphs) && pane.paragraphs.length
                ? pane.paragraphs.map(String)
                : [""],
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
  let toastTimer = 0;

  const workspace = document.querySelector("#workspace");
  const template = document.querySelector("#paneTemplate");
  const app = document.querySelector(".app");
  const saveState = document.querySelector("#saveState");
  const settingsToggle = document.querySelector("#settingsToggle");
  const settingsPanel = document.querySelector("#settingsPanel");
  const toast = document.querySelector("#toast");

  const visiblePanes = () => {
    if (focusId) return state.panes.filter((pane) => pane.id === focusId);
    return state.panes.slice(0, state.layout);
  };

  const setSaveLabel = (label, saving) => {
    saveState.classList.toggle("saving", saving);
    saveState.lastChild.textContent = ` ${label}`;
  };

  const flushSave = () => {
    clearTimeout(saveTimer);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setSaveLabel("自動保存済み", false);
  };

  const saveSoon = () => {
    setSaveLabel("保存中…", true);
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(flushSave, 220);
  };

  const showToast = (message) => {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 1400);
  };

  const equalize = () => {
    state.widths[state.layout] = clone(DEFAULT_WIDTHS[state.layout]);
    saveSoon();
    if (!focusId) {
      workspace.style.gridTemplateColumns = state.widths[state.layout].map((value) => `${value}fr`).join(" ");
    }
    showToast("欄幅を均等にしました");
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
    mobileIndex = clamp(index, 0, Math.max(0, panes.length - 1));
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
    app.classList.add("resizing");

    const move = (moveEvent) => {
      const delta = ((moveEvent.clientX - startX) / width) * 100;
      const left = clamp(start[index] + delta, min, total - min);
      state.widths[state.layout][index] = left;
      state.widths[state.layout][index + 1] = total - left;
      workspace.style.gridTemplateColumns = state.widths[state.layout].map((value) => `${value}fr`).join(" ");
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointercancel", up);
      app.classList.remove("resizing");
      saveSoon();
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    window.addEventListener("pointercancel", up, { once: true });
  };

  const closeSettings = () => {
    settingsPanel.hidden = true;
    settingsToggle.classList.remove("active");
    settingsToggle.setAttribute("aria-expanded", "false");
  };

  const render = () => {
    const panes = visiblePanes();
    workspace.innerHTML = "";
    workspace.style.gridTemplateColumns = focusId
      ? "minmax(0,1fr)"
      : state.widths[state.layout].map((value) => `${value}fr`).join(" ");

    app.classList.toggle("compact", state.compact);
    app.classList.toggle("focus-mode", Boolean(focusId));
    document.querySelector("#fontValue").textContent = state.fontSize;
    document.querySelector("#compactState").textContent = state.compact ? "オン" : "オフ";
    document.querySelector("#compactToggle").classList.toggle("active", state.compact);
    document.querySelectorAll("[data-layout]").forEach((button) => {
      const isActive = Number(button.dataset.layout) === state.layout && !focusId;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    panes.forEach((pane) => {
      const actualIndex = state.panes.findIndex((item) => item.id === pane.id);
      const node = template.content.firstElementChild.cloneNode(true);
      const editor = node.querySelector(".memo-editor");
      const title = node.querySelector(".pane-title");
      const lockButton = node.querySelector('[data-action="lock"]');
      const copyButton = node.querySelector('[data-action="copy"]');
      const focusButton = node.querySelector('[data-action="focus"]');
      const clearButton = node.querySelector('[data-action="clear"]');
      const fontSize = clamp(state.fontSize + pane.fontOffset, 10, 20);

      node.dataset.id = pane.id;
      node.dataset.paneIndex = String(actualIndex);
      node.classList.toggle("locked", pane.locked);
      node.style.setProperty("--pane-font-size", `${fontSize}px`);

      title.value = pane.title;
      title.readOnly = pane.locked;
      title.setAttribute("aria-label", `欄${actualIndex + 1}の名前`);
      editor.value = toText(pane.paragraphs);
      editor.readOnly = pane.locked;
      editor.placeholder = "ここに入力";
      editor.setAttribute("aria-label", `${pane.title || `欄${actualIndex + 1}`}の本文`);

      node.querySelector(".pane-font-value").textContent = `${fontSize}px`;
      node.querySelector(".paragraph-count").textContent = `${countParagraphs(pane.paragraphs)}段落`;
      node.querySelector(".char-count").textContent = `${countChars(pane.paragraphs).toLocaleString("ja-JP")}文字`;

      lockButton.classList.toggle("active", pane.locked);
      lockButton.textContent = pane.locked ? "固定中" : "固定";
      lockButton.setAttribute("aria-pressed", String(pane.locked));
      focusButton.textContent = focusId === pane.id ? "元に戻す" : "集中表示";
      clearButton.disabled = pane.locked;

      title.addEventListener("input", () => {
        pane.title = title.value;
        editor.setAttribute("aria-label", `${pane.title || `欄${actualIndex + 1}`}の本文`);
        saveSoon();
        updatePager();
      });

      editor.addEventListener("input", () => {
        pane.paragraphs = toParagraphs(editor.value);
        node.querySelector(".paragraph-count").textContent = `${countParagraphs(pane.paragraphs)}段落`;
        node.querySelector(".char-count").textContent = `${countChars(pane.paragraphs).toLocaleString("ja-JP")}文字`;
        saveSoon();
      });

      lockButton.addEventListener("click", () => {
        pane.locked = !pane.locked;
        saveSoon();
        render();
      });

      node.querySelector('[data-action="smaller"]').addEventListener("click", () => {
        pane.fontOffset = clamp(pane.fontOffset - 1, -4, 6);
        const nextSize = clamp(state.fontSize + pane.fontOffset, 10, 20);
        node.style.setProperty("--pane-font-size", `${nextSize}px`);
        node.querySelector(".pane-font-value").textContent = `${nextSize}px`;
        saveSoon();
      });

      node.querySelector('[data-action="larger"]').addEventListener("click", () => {
        pane.fontOffset = clamp(pane.fontOffset + 1, -4, 6);
        const nextSize = clamp(state.fontSize + pane.fontOffset, 10, 20);
        node.style.setProperty("--pane-font-size", `${nextSize}px`);
        node.querySelector(".pane-font-value").textContent = `${nextSize}px`;
        saveSoon();
      });

      copyButton.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(toText(pane.paragraphs));
          showToast(`「${pane.title}」をコピーしました`);
        } catch {
          showToast("コピーできませんでした");
        }
      });

      focusButton.addEventListener("click", () => {
        focusId = focusId === pane.id ? null : pane.id;
        mobileIndex = 0;
        render();
      });

      clearButton.addEventListener("click", () => {
        if (pane.locked) return;
        if (toText(pane.paragraphs).trim() && !confirm(`「${pane.title}」の内容をすべて消しますか？`)) return;
        pane.paragraphs = [""];
        editor.value = "";
        node.querySelector(".paragraph-count").textContent = "0段落";
        node.querySelector(".char-count").textContent = "0文字";
        node.querySelector(".pane-more").open = false;
        saveSoon();
        editor.focus();
        showToast(`「${pane.title}」を空にしました`);
      });

      const resize = node.querySelector(".resize-handle");
      if (focusId || pane === panes[panes.length - 1]) {
        resize.remove();
      } else {
        const visibleIndex = panes.indexOf(pane);
        resize.addEventListener("pointerdown", (event) => startResize(visibleIndex, event));
        resize.addEventListener("dblclick", equalize);
      }

      workspace.appendChild(node);
    });

    updatePager();
  };

  document.querySelectorAll("[data-layout]").forEach((button) => {
    button.addEventListener("click", () => {
      state.layout = Number(button.dataset.layout);
      focusId = null;
      mobileIndex = 0;
      saveSoon();
      render();
    });
  });

  settingsToggle.addEventListener("click", () => {
    const willOpen = settingsPanel.hidden;
    settingsPanel.hidden = !willOpen;
    settingsToggle.classList.toggle("active", willOpen);
    settingsToggle.setAttribute("aria-expanded", String(willOpen));
  });

  document.addEventListener("pointerdown", (event) => {
    if (!settingsPanel.hidden && !event.target.closest(".settings-wrap")) closeSettings();
    document.querySelectorAll(".pane-more[open]").forEach((details) => {
      if (!details.contains(event.target)) details.open = false;
    });
  });

  document.querySelector("#fontDown").addEventListener("click", () => {
    state.fontSize = clamp(state.fontSize - 1, 11, 18);
    saveSoon();
    render();
  });

  document.querySelector("#fontUp").addEventListener("click", () => {
    state.fontSize = clamp(state.fontSize + 1, 11, 18);
    saveSoon();
    render();
  });

  document.querySelector("#compactToggle").addEventListener("click", () => {
    state.compact = !state.compact;
    saveSoon();
    render();
  });

  document.querySelector("#equalize").addEventListener("click", equalize);
  document.querySelector("#mobilePrev").addEventListener("click", () => goMobile(mobileIndex - 1));
  document.querySelector("#mobileNext").addEventListener("click", () => goMobile(mobileIndex + 1));

  workspace.addEventListener(
    "scroll",
    () => {
      if (workspace.clientWidth && matchMedia("(max-width:800px)").matches) {
        mobileIndex = clamp(
          Math.round(workspace.scrollLeft / workspace.clientWidth),
          0,
          Math.max(0, visiblePanes().length - 1),
        );
        updatePager();
      }
    },
    { passive: true },
  );

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!settingsPanel.hidden) {
        closeSettings();
        return;
      }
      if (focusId) {
        focusId = null;
        render();
        return;
      }
    }

    if (!event.altKey || event.ctrlKey || event.metaKey) return;
    const number = Number(event.key);
    const panes = visiblePanes();
    if (!Number.isInteger(number) || number < 1 || number > panes.length) return;

    event.preventDefault();
    const editor = workspace.querySelectorAll(".memo-editor")[number - 1];
    editor?.focus();
    if (matchMedia("(max-width:800px)").matches) goMobile(number - 1);
  });

  window.addEventListener("pagehide", flushSave);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushSave();
  });

  render();
})();
