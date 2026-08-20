(() => {
  const STORAGE_KEY = "multimemos.workspace.v1";
  const LEGACY_DEFAULT_TITLES = ["返信元・素材", "AI案・参考", "作業文", "メモ"];
  const ALLOWED_COLORS = ["default", "cream", "blue", "green"];
  const COLOR_OPTIONS = [
    { id: "default", label: "標準" },
    { id: "cream", label: "クリーム" },
    { id: "blue", label: "ブルー" },
    { id: "green", label: "グリーン" },
  ];
  const DEFAULT_PANES = [
    { id: "reference", title: "欄1", paragraphs: [""], fontOffset: 0, color: "default" },
    { id: "draft-a", title: "欄2", paragraphs: [""], fontOffset: 0, color: "default" },
    { id: "draft-b", title: "欄3", paragraphs: [""], fontOffset: 0, color: "default" },
    { id: "notes", title: "欄4", paragraphs: [""], fontOffset: 0, color: "default" },
  ];
  const DEFAULT_WIDTHS = { 2: [50, 50], 3: [33.333, 33.334, 33.333], 4: [25, 25, 25, 25] };
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const toText = (paragraphs) => paragraphs.join("\n\n");
  const toParagraphs = (text) => String(text ?? "").replace(/\r\n?/g, "\n").split(/\n{2,}/);
  const countChars = (paragraphs) => toText(paragraphs).replace(/\s/g, "").length;
  const countParagraphs = (paragraphs) => (toText(paragraphs).trim() ? paragraphs.length : 0);

  const customizationStyle = document.createElement("style");
  customizationStyle.id = "multimemos-pane-customization";
  customizationStyle.textContent = `
    .memo-pane[data-color="cream"] { --pane-bg: #fbf4df; }
    .memo-pane[data-color="blue"] { --pane-bg: #edf4f7; }
    .memo-pane[data-color="green"] { --pane-bg: #edf5ec; }

    .pane-bg-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 9px 5px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 9px;
    }
    .pane-bg-options { display: flex; align-items: center; gap: 5px; }
    .pane-bg-swatch {
      position: relative;
      width: 26px;
      height: 26px;
      flex: 0 0 auto;
      padding: 0;
      border: 1px solid rgba(51, 47, 42, 0.18);
      border-radius: 7px;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.46);
      cursor: pointer;
      transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
    }
    .pane-bg-swatch:hover { transform: translateY(-1px); border-color: rgba(51, 47, 42, 0.42); }
    .pane-bg-swatch[data-color-choice="default"] {
      background: linear-gradient(135deg, #fcfaf5 0 25%, #f7faf9 25% 50%, #f8faf5 50% 75%, #faf7fa 75%);
    }
    .pane-bg-swatch[data-color-choice="cream"] { background: #fbf4df; }
    .pane-bg-swatch[data-color-choice="blue"] { background: #edf4f7; }
    .pane-bg-swatch[data-color-choice="green"] { background: #edf5ec; }
    .pane-bg-swatch::after {
      content: "✓";
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      border-radius: 6px;
      background: rgba(34, 31, 27, 0.68);
      color: #fff;
      font-size: 12px;
      font-weight: 800;
      opacity: 0;
      transform: scale(.72);
      transition: opacity 110ms ease, transform 130ms ease;
    }
    .pane-bg-swatch[aria-pressed="true"] {
      border-color: #4a4640;
      box-shadow: 0 0 0 2px rgba(74, 70, 64, 0.13), inset 0 0 0 1px rgba(255,255,255,.6);
    }
    .pane-bg-swatch[aria-pressed="true"]::after { opacity: 1; transform: scale(1); }
  `;
  document.head.appendChild(customizationStyle);

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

  const normalizeState = (saved = {}) => ({
    layout: [2, 3, 4].includes(saved.layout) ? saved.layout : 3,
    mobileColumns: [1, 2].includes(saved.mobileColumns) ? saved.mobileColumns : 2,
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
        color: ALLOWED_COLORS.includes(pane.color) ? pane.color : "default",
      };
    }),
  });

  const load = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? normalizeState(JSON.parse(raw)) : normalizeState();
    } catch {
      return normalizeState();
    }
  };

  let state = load();
  let focusId = null;
  let mobileIndex = 0;
  let saveTimer = 0;
  let toastTimer = 0;
  let isRendering = false;
  let renderPending = false;

  const workspace = document.querySelector("#workspace");
  const template = document.querySelector("#paneTemplate");
  const app = document.querySelector(".app");
  const saveState = document.querySelector("#saveState");
  const settingsToggle = document.querySelector("#settingsToggle");
  const settingsPanel = document.querySelector("#settingsPanel");
  const toast = document.querySelector("#toast");

  if (!workspace || !template || !app || !saveState || !settingsToggle || !settingsPanel || !toast) {
    console.error("[MultiMemos] required UI elements are missing");
    return;
  }

  const visiblePanes = () => {
    if (focusId) return state.panes.filter((pane) => pane.id === focusId);
    return state.panes.slice(0, state.layout);
  };

  const mobilePageSize = () => (focusId ? 1 : state.mobileColumns);

  const mobilePageStarts = () => {
    const count = visiblePanes().length;
    const step = mobilePageSize();
    const maxStart = Math.max(0, count - step);
    return Array.from({ length: maxStart + 1 }, (_, index) => index);
  };

  const nearestMobileStart = (index) => {
    const starts = mobilePageStarts();
    return starts.reduce(
      (nearest, start) => Math.abs(start - index) < Math.abs(nearest - index) ? start : nearest,
      starts[0] ?? 0,
    );
  };

  const setSaveLabel = (label, saving) => {
    saveState.classList.toggle("saving", saving);
    saveState.lastChild.textContent = ` ${label}`;
  };

  const persistState = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  const flushSave = () => {
    clearTimeout(saveTimer);
    saveTimer = 0;
    persistState();
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
    const step = mobilePageSize();
    const starts = mobilePageStarts();
    mobileIndex = nearestMobileStart(mobileIndex);
    const firstNumber = panes.length ? mobileIndex + 1 : 0;
    const lastNumber = Math.min(mobileIndex + step, panes.length);
    document.querySelector("#mobileCount").textContent =
      step === 1 ? `${firstNumber} / ${panes.length}` : `${firstNumber}–${lastNumber} / ${panes.length}`;
    document.querySelector("#mobileTitle").textContent = panes
      .slice(mobileIndex, mobileIndex + step)
      .map((pane) => pane.title)
      .join("・");
    document.querySelector("#mobilePrev").disabled = mobileIndex === 0;
    document.querySelector("#mobileNext").disabled = mobileIndex >= (starts[starts.length - 1] ?? 0);
    document.querySelector("#mobilePrev").setAttribute("aria-label", step === 1 ? "前の欄" : "前の組");
    document.querySelector("#mobileNext").setAttribute("aria-label", step === 1 ? "次の欄" : "次の組");
  };

  const goMobile = (index, behavior = "smooth") => {
    const step = mobilePageSize();
    mobileIndex = nearestMobileStart(index);
    workspace.scrollTo({ left: mobileIndex * (workspace.clientWidth / step), behavior });
    updatePager();
  };

  const moveMobilePage = (direction) => {
    const starts = mobilePageStarts();
    const current = Math.max(0, starts.indexOf(nearestMobileStart(mobileIndex)));
    const next = clamp(current + direction, 0, starts.length - 1);
    goMobile(starts[next]);
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

  const isPaneInCurrentLayout = (paneId) => state.panes.slice(0, state.layout).some((pane) => pane.id === paneId);

  const setFocusMode = (paneId = null) => {
    const nextFocusId = paneId && isPaneInCurrentLayout(paneId) ? paneId : null;
    if (focusId === nextFocusId) return false;
    focusId = nextFocusId;
    mobileIndex = 0;
    render();
    return true;
  };

  const exitFocusMode = () => setFocusMode(null);

  const toggleFocusMode = (paneId) => {
    if (focusId === paneId) return exitFocusMode();
    return setFocusMode(paneId);
  };

  const setLayout = (layout) => {
    const nextLayout = Number(layout);
    if (![2, 3, 4].includes(nextLayout)) return false;
    state.layout = nextLayout;
    focusId = null;
    mobileIndex = 0;
    saveSoon();
    render();
    return true;
  };

  const getAllPaneData = () => state.panes.map((pane) => ({
    id: pane.id,
    title: pane.title,
    text: toText(pane.paragraphs),
    color: pane.color,
    fontOffset: pane.fontOffset,
  }));

  const batchSetPaneTexts = (entries = []) => {
    if (!Array.isArray(entries) || !entries.length) return false;
    let changed = false;
    entries.forEach((entry) => {
      const pane = state.panes.find((candidate) => candidate.id === entry?.id);
      if (!pane || typeof entry?.text !== "string") return;
      const nextParagraphs = toParagraphs(entry.text);
      if (toText(pane.paragraphs) === toText(nextParagraphs)) return;
      pane.paragraphs = nextParagraphs;
      changed = true;
    });
    if (!changed) return false;
    saveSoon();
    render();
    return true;
  };

  const resetWorkspaceContent = () => {
    state.panes.forEach((pane, index) => {
      pane.title = DEFAULT_PANES[index].title;
      pane.paragraphs = [""];
    });
    focusId = null;
    mobileIndex = 0;
    flushSave();
    render();
  };

  const emitRendered = () => {
    window.dispatchEvent(new CustomEvent("multimemos:rendered", {
      detail: { focusId, layout: state.layout },
    }));
  };

  const render = () => {
    if (isRendering) {
      renderPending = true;
      return;
    }

    isRendering = true;
    try {
      const panes = visiblePanes();
      workspace.replaceChildren();
      workspace.style.gridTemplateColumns = focusId
        ? "minmax(0,1fr)"
        : state.widths[state.layout].map((value) => `${value}fr`).join(" ");

      app.classList.toggle("compact", state.compact);
      app.classList.toggle("focus-mode", Boolean(focusId));
      app.classList.toggle("mobile-two", state.mobileColumns === 2 && !focusId);
      document.querySelector("#fontValue").textContent = state.fontSize;
      document.querySelector("#compactState").textContent = state.compact ? "オン" : "オフ";
      document.querySelector("#compactToggle").classList.toggle("active", state.compact);
      document.querySelectorAll("[data-layout]").forEach((button) => {
        const isActive = Number(button.dataset.layout) === state.layout && !focusId;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });
      document.querySelectorAll("[data-mobile-columns]").forEach((button) => {
        const isActive = Number(button.dataset.mobileColumns) === state.mobileColumns;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });

      panes.forEach((pane) => {
        const actualIndex = state.panes.findIndex((item) => item.id === pane.id);
        const visibleIndex = panes.indexOf(pane);
        const node = template.content.firstElementChild.cloneNode(true);
        const editor = node.querySelector(".memo-editor");
        const title = node.querySelector(".pane-title");
        const copyButton = node.querySelector('[data-action="copy"]');
        const focusButton = node.querySelector('[data-action="focus"]');
        const clearButton = node.querySelector('.pane-menu [data-action="clear"]');
        const fontSize = clamp(state.fontSize + pane.fontOffset, 10, 20);

        if (!editor || !title || !copyButton || !focusButton) {
          throw new Error(`[MultiMemos] pane template is incomplete for ${pane.id}`);
        }

        node.dataset.id = pane.id;
        node.dataset.paneIndex = String(actualIndex);
        node.dataset.color = pane.color;
        node.classList.toggle("mobile-group-start", mobilePageStarts().includes(visibleIndex));
        node.style.setProperty("--pane-font-size", `${fontSize}px`);

        title.value = pane.title;
        title.readOnly = false;
        title.setAttribute("aria-label", `欄${actualIndex + 1}の名前`);
        editor.value = toText(pane.paragraphs);
        editor.readOnly = false;
        editor.placeholder = "ここに入力";
        editor.setAttribute("aria-label", `${pane.title || `欄${actualIndex + 1}`}の本文`);

        node.querySelector(".pane-font-value").textContent = `${fontSize}px`;
        node.querySelector(".pane-number").textContent = String(actualIndex + 1).padStart(2, "0");
        node.querySelector(".paragraph-count").textContent = `${countParagraphs(pane.paragraphs)}段落`;
        node.querySelector(".char-count").textContent = `${countChars(pane.paragraphs).toLocaleString("ja-JP")}文字`;

        focusButton.classList.toggle("active", focusId === pane.id);
        focusButton.setAttribute("aria-label", focusId === pane.id ? "集中表示を終了" : "この欄を集中表示");
        focusButton.dataset.tooltip = focusId === pane.id ? "元に戻す" : "集中表示";
        focusButton.title = focusId === pane.id ? "すべての欄の表示に戻します" : "この欄だけを大きく表示します";

        const paneMenu = node.querySelector(".pane-menu");
        const colorRow = document.createElement("div");
        colorRow.className = "pane-bg-row";
        colorRow.innerHTML = `
          <span>背景色</span>
          <div class="pane-bg-options" role="group" aria-label="背景色を選択">
            ${COLOR_OPTIONS.map(
              (option) => `<button type="button" class="pane-bg-swatch" data-color-choice="${option.id}" aria-label="背景色：${option.label}" title="${option.label}" aria-pressed="${pane.color === option.id}"></button>`,
            ).join("")}
          </div>
        `;
        if (paneMenu) paneMenu.insertBefore(colorRow, clearButton || null);

        colorRow.querySelectorAll("[data-color-choice]").forEach((button) => {
          button.addEventListener("click", () => {
            const selectedColor = button.dataset.colorChoice;
            if (!ALLOWED_COLORS.includes(selectedColor)) return;
            pane.color = selectedColor;
            node.dataset.color = selectedColor;
            colorRow.querySelectorAll("[data-color-choice]").forEach((choice) => {
              choice.setAttribute("aria-pressed", String(choice.dataset.colorChoice === selectedColor));
            });
            saveSoon();
            showToast(`「${pane.title}」の背景色を${button.title}にしました`);
          });
        });

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
            copyButton.classList.add("copied");
            window.setTimeout(() => copyButton.classList.remove("copied"), 620);
            showToast(`「${pane.title}」をコピーしました`);
          } catch {
            showToast("コピーできませんでした");
          }
        });

        focusButton.addEventListener("click", () => toggleFocusMode(pane.id));

        clearButton?.addEventListener("click", () => {
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
          resize?.remove();
        } else {
          resize?.addEventListener("pointerdown", (event) => startResize(visibleIndex, event));
          resize?.addEventListener("dblclick", equalize);
        }

        workspace.appendChild(node);
      });

      updatePager();
      emitRendered();
    } catch (error) {
      console.error("[MultiMemos] render failed", error);
    } finally {
      isRendering = false;
      if (renderPending) {
        renderPending = false;
        queueMicrotask(render);
      }
    }
  };

  window.MultiMemosCore = Object.freeze({
    getStateSnapshot: () => clone(state),
    getFocusId: () => focusId,
    getAllPaneData,
    setFocusMode,
    exitFocusMode,
    toggleFocusMode,
    setLayout,
    batchSetPaneTexts,
    resetWorkspaceContent,
    flushSave,
  });

  document.querySelectorAll("[data-layout]").forEach((button) => {
    button.addEventListener("click", () => setLayout(button.dataset.layout));
  });

  document.querySelectorAll("[data-mobile-columns]").forEach((button) => {
    button.addEventListener("click", () => {
      state.mobileColumns = Number(button.dataset.mobileColumns);
      focusId = null;
      mobileIndex = 0;
      saveSoon();
      render();
      goMobile(0, "auto");
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
  document.querySelector("#mobilePrev").addEventListener("click", () => moveMobilePage(-1));
  document.querySelector("#mobileNext").addEventListener("click", () => moveMobilePage(1));

  workspace.addEventListener(
    "scroll",
    () => {
      if (workspace.clientWidth && matchMedia("(max-width:800px)").matches) {
        const step = mobilePageSize();
        const paneWidth = workspace.clientWidth / step;
        mobileIndex = nearestMobileStart(Math.round(workspace.scrollLeft / paneWidth));
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
        exitFocusMode();
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
  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (matchMedia("(max-width:800px)").matches) goMobile(mobileIndex, "auto");
    }, 80);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushSave();
  });

  render();
})();
