(() => {
  const workspace = document.querySelector("#workspace");
  const template = document.querySelector("#paneTemplate");
  const globalActions = document.querySelector(".global-actions");
  if (!workspace || !template || !globalActions) return;

  const style = document.createElement("style");
  style.textContent = `
    .workspace-quick-actions {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding-right: 2px;
    }
    .workspace-action {
      height: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 0 9px;
      border: 1px solid var(--line);
      border-radius: 7px;
      background: rgba(255,254,250,.76);
      color: var(--muted);
      box-shadow: 0 1px 0 rgba(255,255,255,.72);
      font-size: 9px;
      font-weight: 680;
      white-space: nowrap;
      cursor: pointer;
      transition: color 140ms ease, border-color 140ms ease, background 140ms ease, transform 140ms ease;
    }
    .workspace-action:hover {
      color: var(--ink);
      border-color: var(--line-strong);
      background: var(--surface-strong);
      transform: translateY(-1px);
    }
    .workspace-action:active { transform: translateY(1px); }
    .workspace-action.danger { color: var(--danger); }
    .workspace-action .icon { width: 14px; height: 14px; }

    .pane-actions > button[data-action="clear"] {
      color: var(--danger);
    }
    .pane-actions > button[data-action="clear"]:hover:not(:disabled) {
      border-color: rgba(155,76,68,.22);
      background: rgba(155,76,68,.09);
      color: var(--danger);
    }

    .undo-bar {
      position: fixed;
      z-index: 110;
      left: 50%;
      bottom: 40px;
      min-width: min(360px, calc(100vw - 24px));
      max-width: calc(100vw - 24px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 9px 10px 9px 13px;
      border: 1px solid rgba(255,255,255,.16);
      border-radius: 10px;
      background: rgba(29,28,26,.94);
      box-shadow: 0 14px 38px rgba(26,24,21,.24);
      color: #fff;
      transform: translateX(-50%);
      animation: undo-in 150ms ease-out;
    }
    .undo-bar[hidden] { display: none !important; }
    .undo-bar span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 10px;
      font-weight: 650;
    }
    .undo-bar button {
      flex: 0 0 auto;
      min-width: 72px;
      height: 28px;
      padding: 0 10px;
      border: 1px solid rgba(255,255,255,.3);
      border-radius: 6px;
      background: rgba(255,255,255,.1);
      color: #fff;
      font-size: 9px;
      font-weight: 760;
      cursor: pointer;
    }
    .undo-bar button:hover { background: rgba(255,255,255,.18); }
    @keyframes undo-in {
      from { opacity: 0; transform: translate(-50%, 5px); }
    }

    @media (max-width: 1060px) {
      .workspace-action span { display: none; }
      .workspace-action { width: 34px; padding: 0; }
    }
    @media (max-width: 800px) {
      .workspace-quick-actions { gap: 2px; }
      .workspace-action { width: 31px; height: 34px; }
      .undo-bar { bottom: 12px; }
    }
    @media (max-width: 420px) {
      .workspace-action { width: 29px; }
      .global-actions { gap: 4px; }
    }
  `;
  document.head.appendChild(style);

  const svg = {
    clear: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M8 10v7M12 10v7M16 10v7M6 7l1 13h10l1-13"/></svg>',
    copy: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  };

  const quick = document.createElement("div");
  quick.className = "workspace-quick-actions";
  quick.innerHTML = `
    <button type="button" id="copyAllPanes" class="workspace-action" title="4欄すべてを見出し付きでコピー">
      ${svg.copy}<span>全欄コピー</span>
    </button>
    <button type="button" id="clearAllPanes" class="workspace-action danger" title="固定していない欄の内容をすべてクリア">
      ${svg.clear}<span>全欄クリア</span>
    </button>
  `;
  globalActions.insertBefore(quick, globalActions.firstChild);

  const undoBar = document.createElement("div");
  undoBar.id = "undoBar";
  undoBar.className = "undo-bar";
  undoBar.hidden = true;
  undoBar.setAttribute("role", "status");
  undoBar.setAttribute("aria-live", "polite");
  undoBar.innerHTML = '<span id="undoMessage"></span><button type="button" id="undoAction">元に戻す</button>';
  document.body.appendChild(undoBar);

  let undoSnapshot = null;
  let undoTimer = 0;

  const showUndo = (message, snapshot) => {
    clearTimeout(undoTimer);
    undoSnapshot = snapshot;
    undoBar.querySelector("#undoMessage").textContent = message;
    undoBar.hidden = false;
    undoTimer = window.setTimeout(() => {
      undoBar.hidden = true;
      undoSnapshot = null;
    }, 7000);
  };

  const allRenderedPanes = () => [...workspace.querySelectorAll(".memo-pane")];

  const editorText = (pane) => pane.querySelector(".memo-editor")?.value ?? "";
  const paneTitle = (pane, index) =>
    pane.querySelector(".pane-title")?.value?.trim() || `欄${index + 1}`;

  const setPaneText = (pane, text) => {
    const editor = pane.querySelector(".memo-editor");
    if (!editor) return;
    editor.value = text;
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const getCurrentLayout = () => {
    const active = document.querySelector("[data-layout].active");
    return active ? Number(active.dataset.layout) : allRenderedPanes().length || 3;
  };

  const withAllPanes = (callback) => {
    const originalLayout = getCurrentLayout();
    const wasFocusMode = document.querySelector(".app")?.classList.contains("focus-mode");
    const focusedPaneId = wasFocusMode ? workspace.querySelector(".memo-pane")?.dataset.id : null;
    const app = document.querySelector(".app");

    if (app) app.style.setProperty("visibility", "hidden");

    if (wasFocusMode) {
      workspace.querySelector('[data-action="focus"]')?.click();
    }
    if (getCurrentLayout() !== 4) {
      document.querySelector('[data-layout="4"]')?.click();
    }

    const result = callback(allRenderedPanes());

    if (originalLayout !== 4) {
      document.querySelector(`[data-layout="${originalLayout}"]`)?.click();
    }
    if (wasFocusMode && focusedPaneId) {
      workspace.querySelector(`.memo-pane[data-id="${focusedPaneId}"] [data-action="focus"]`)?.click();
    }

    if (app) {
      requestAnimationFrame(() => app.style.removeProperty("visibility"));
    }
    return result;
  };

  const makeClearButton = () => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = "clear";
    button.dataset.enhancedClear = "true";
    button.dataset.tooltip = "クリア";
    button.setAttribute("aria-label", "この欄をクリア");
    button.title = "この欄の内容をクリアします。直後なら元に戻せます";
    button.innerHTML = svg.clear;
    return button;
  };

  const decorateTemplate = () => {
    const root = template.content;
    root.querySelector(".pane-menu [data-action='clear']")?.remove();
    const actions = root.querySelector(".pane-actions");
    if (actions && !actions.querySelector("[data-enhanced-clear]")) {
      const focusButton = actions.querySelector('[data-action="focus"]');
      actions.insertBefore(makeClearButton(), focusButton || actions.querySelector(".pane-more"));
    }
  };

  const decorateRendered = () => {
    allRenderedPanes().forEach((pane) => {
      pane.querySelector(".pane-menu [data-action='clear']")?.remove();
      const actions = pane.querySelector(".pane-actions");
      if (!actions || actions.querySelector("[data-enhanced-clear]")) return;
      const button = makeClearButton();
      button.disabled = pane.classList.contains("locked");
      const focusButton = actions.querySelector('[data-action="focus"]');
      actions.insertBefore(button, focusButton || actions.querySelector(".pane-more"));
    });
  };

  decorateTemplate();
  decorateRendered();

  const observer = new MutationObserver(() => decorateRendered());
  observer.observe(workspace, { childList: true });

  workspace.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest("[data-enhanced-clear]");
      if (!button) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const pane = button.closest(".memo-pane");
      if (!pane || pane.classList.contains("locked")) return;
      const previous = editorText(pane);
      if (!previous) return;

      const id = pane.dataset.id;
      const title = pane.querySelector(".pane-title")?.value?.trim() || "この欄";
      setPaneText(pane, "");
      showUndo(`「${title}」をクリアしました`, [{ id, text: previous }]);
      pane.querySelector(".memo-editor")?.focus();
    },
    true,
  );

  undoBar.querySelector("#undoAction").addEventListener("click", () => {
    if (!undoSnapshot?.length) return;
    const snapshot = undoSnapshot;
    clearTimeout(undoTimer);
    undoBar.hidden = true;
    undoSnapshot = null;

    withAllPanes((panes) => {
      snapshot.forEach((item) => {
        const pane = panes.find((candidate) => candidate.dataset.id === item.id);
        if (pane) setPaneText(pane, item.text);
      });
    });
  });

  document.querySelector("#copyAllPanes")?.addEventListener("click", async () => {
    const text = withAllPanes((panes) =>
      panes
        .map((pane, index) => `【${paneTitle(pane, index)}】\n${editorText(pane)}`)
        .join("\n\n"),
    );

    try {
      await navigator.clipboard.writeText(text);
      const toast = document.querySelector("#toast");
      if (toast) {
        toast.textContent = "全欄をコピーしました";
        toast.hidden = false;
        window.setTimeout(() => { toast.hidden = true; }, 1400);
      }
    } catch {
      const toast = document.querySelector("#toast");
      if (toast) {
        toast.textContent = "コピーできませんでした";
        toast.hidden = false;
        window.setTimeout(() => { toast.hidden = true; }, 1400);
      }
    }
  });

  document.querySelector("#clearAllPanes")?.addEventListener("click", () => {
    const snapshot = withAllPanes((panes) => {
      const changed = [];
      panes.forEach((pane) => {
        if (pane.classList.contains("locked")) return;
        const text = editorText(pane);
        if (!text) return;
        changed.push({ id: pane.dataset.id, text });
        setPaneText(pane, "");
      });
      return changed;
    });

    if (!snapshot.length) return;
    const lockedCount = withAllPanes((panes) =>
      panes.filter((pane) => pane.classList.contains("locked") && editorText(pane)).length,
    );
    const message = lockedCount
      ? `${snapshot.length}欄をクリアしました（固定${lockedCount}欄は保持）`
      : `${snapshot.length}欄をクリアしました`;
    showUndo(message, snapshot);
  });
})();
