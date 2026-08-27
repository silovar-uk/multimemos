(() => {
  const workspace = document.querySelector("#workspace");
  const globalActions = document.querySelector(".global-actions");
  const core = window.MultiMemosCore;
  if (!workspace || !globalActions || !core) {
    console.error("[MultiMemos] enhancements require MultiMemosCore");
    return;
  }

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

    .pane-actions > button[data-enhanced-clear] { color: var(--danger); }
    .pane-actions > button[data-enhanced-clear]:hover {
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
    @keyframes undo-in { from { opacity: 0; transform: translate(-50%, 5px); } }

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
    <button type="button" id="clearAllPanes" class="workspace-action danger" title="4欄すべての内容をクリアし、MD表示も解除して編集表示に戻す">
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
  const markdownApi = () => window.MultiMemosMarkdown;

  const makeClearButton = () => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.enhancedClear = "true";
    button.dataset.tooltip = "クリア";
    button.setAttribute("aria-label", "この欄をクリア");
    button.title = "この欄の内容をクリアします。直後なら元に戻せます";
    button.innerHTML = svg.clear;
    return button;
  };

  // Important: do not mutate #paneTemplate. app-core owns that template and
  // expects its menu structure to remain stable across every render.
  const decorateRendered = () => {
    allRenderedPanes().forEach((pane) => {
      pane.querySelector(".pane-menu [data-action='clear']")?.remove();
      const actions = pane.querySelector(".pane-actions");
      if (!actions || actions.querySelector("[data-enhanced-clear]")) return;
      const focusButton = actions.querySelector('[data-action="focus"]');
      actions.insertBefore(makeClearButton(), focusButton || actions.querySelector(".pane-more"));
    });
  };

  decorateRendered();
  window.addEventListener("multimemos:rendered", decorateRendered);

  workspace.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest("[data-enhanced-clear]");
      if (!button) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const pane = button.closest(".memo-pane");
      if (!pane) return;
      const previous = editorText(pane);
      if (!previous) return;

      const id = pane.dataset.id;
      const title = pane.querySelector(".pane-title")?.value?.trim() || "この欄";
      core.batchSetPaneTexts([{ id, text: "" }]);
      showUndo(`「${title}」をクリアしました`, {
        type: "text",
        texts: [{ id, text: previous }],
      });
      window.requestAnimationFrame(() => {
        workspace.querySelector(`.memo-pane[data-id="${id}"] .memo-editor`)?.focus();
      });
    },
    true,
  );

  undoBar.querySelector("#undoAction").addEventListener("click", () => {
    if (!undoSnapshot) return;
    const snapshot = undoSnapshot;
    clearTimeout(undoTimer);
    undoBar.hidden = true;
    undoSnapshot = null;

    if (snapshot.texts?.length) core.batchSetPaneTexts(snapshot.texts);
    if (snapshot.type === "workspace-clear" && snapshot.markdownModes) {
      markdownApi()?.setModes?.(snapshot.markdownModes);
    }
  });

  document.querySelector("#copyAllPanes")?.addEventListener("click", async () => {
    const text = core.getAllPaneData()
      .map((pane, index) => `【${pane.title || `欄${index + 1}`}】\n${pane.text}`)
      .join("\n\n");

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
    const changedTexts = core.getAllPaneData()
      .filter((pane) => pane.text.length > 0)
      .map(({ id, text }) => ({ id, text }));

    const markdown = markdownApi();
    const markdownModes = markdown?.getModes?.() || null;
    const hadMarkdown = markdownModes
      ? Object.values(markdownModes).some((mode) => mode === "markdown")
      : false;

    if (!changedTexts.length && !hadMarkdown) return;

    if (changedTexts.length) {
      core.batchSetPaneTexts(changedTexts.map(({ id }) => ({ id, text: "" })));
    }
    if (hadMarkdown) markdown?.setAllMode?.("edit");

    const message = changedTexts.length && hadMarkdown
      ? "全欄をクリアして編集表示に戻しました"
      : hadMarkdown
        ? "全欄を編集表示に戻しました"
        : `${changedTexts.length}欄をクリアしました`;

    showUndo(message, {
      type: "workspace-clear",
      texts: changedTexts,
      markdownModes: hadMarkdown ? markdownModes : null,
    });
  });
})();
