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
        widths: saved.widths || clone(DEFAULT_WIDTHS),
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

  const workspace = document.querySelector("#workspace");
  const template = document.querySelector("#paneTemplate");
  const app = document.querySelector(".app");
  const saveState = document.querySelector("#saveState");
  const settingsToggle = document.querySelector("#settingsToggle");
  const settingsPanel = document.querySelector("#settingsPanel");

  const visiblePanes = () => {
    if (focusId) return state.panes.filter((pane) => pane.id === focusId);
    return state.panes.slice(0, state.layout);
  };

  const saveSoon = () => {
    saveState.classList.add("saving");
    saveState.lastChild.textContent = " 保存中…";
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      saveState.classList.remove("saving");
      saveState.lastChild.textContent = " 自動保存済み";
    }, 220);
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

    const move = (moveEvent) => {
      const delta = ((moveEvent.clientX - startX) / width) * 100;
      const left = clamp(start[index] + delta, min, total - min);
      state.widths[state.layout][index] = left;
      state.widths[state.layout][index + 1] = total - left;
      workspace.style.gridTemplateColumns = state.widths[state.layout].map((value) => `${value}fr`).join(" ");
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      saveSoon();
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
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
    document.querySelector("#fontValue").textContent = state.fontSize;
    document.querySelector("#compactState").textContent = state.compact ? "オン" : "オフ";
    document.querySelector("#compactToggle").classList.toggle("active", state.compact);
    document.querySelectorAll("[data-layout]").forEach((button) => {
      button.classList.toggle("active", Number(button.dataset.layout) === state.layout && !focusId);
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
      editor.value = toText(pane.paragraphs);
      editor.readOnly = pane.locked;
      editor.placeholder = "";

      node.querySelector(".pane-font-value").textContent = `${fontSize}px`;
      node.querySelector(".paragraph-count").textContent = `${pane.paragraphs.length}段落`;
      node.querySelector(".char-count").textContent = `${countChars(pane.paragraphs).toLocaleString("ja-JP")}文字`;

      lockButton.classList.toggle("active", pane.locked);
      lockButton.textContent = pane.locked ? "固定中" : "固定";
      focusButton.textContent = focusId === pane.id ? "元に戻す" : "集中表示";
      clearButton.disabled = pane.locked;

      title.addEventListener("input", () => {
        pane.title = title.value;
        saveSoon();
        updatePager();
      });

      editor.addEventListener("input", () => {
        pane.paragraphs = toParagraphs(editor.value);
        node.querySelector(".paragraph-count").textContent = `${pane.paragraphs.length}段落`;
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
        saveSoon();
        render();
      });

      node.querySelector('[data-action="larger"]').addEventListener("click", () => {
        pane.fontOffset = clamp(pane.fontOffset + 1, -4, 6);
        saveSoon();
        render();
      });

      copyButton.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(toText(pane.paragraphs));
          copyButton.textContent = "コピー済";
          window.setTimeout(() => {
            copyButton.textContent = "コピー";
          }, 900);
        } catch {
          copyButton.textContent = "失敗";
          window.setTimeout(() => {
            copyButton.textContent = "コピー";
          }, 900);
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
        saveSoon();
        render();
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

  render();
})();
