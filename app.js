(() => {
  // Header responsive guard.
  const headerResponsiveStyle = document.createElement("style");
  headerResponsiveStyle.id = "multimemos-header-responsive";
  headerResponsiveStyle.textContent = `
    .topbar > *,
    .brand,
    .brand-type,
    .global-actions,
    .layout-control {
      min-width: 0;
    }

    .brand-type strong {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    @media (min-width: 801px) {
      .topbar {
        grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
      }

      .global-actions {
        max-width: 100%;
      }
    }

    @media (min-width: 801px) and (max-width: 1180px) {
      .topbar {
        gap: 14px;
        padding-inline: 16px;
      }

      .brand-tagline,
      .control-label {
        display: none;
      }

      .layout-switch button {
        min-width: 42px;
        padding-inline: 7px;
      }

      .settings-toggle {
        padding-inline: 9px;
      }
    }

    @media (min-width: 801px) and (max-width: 920px) {
      .brand-type small {
        display: none;
      }

      .global-actions {
        gap: 5px;
      }

      .diff-link {
        width: 36px;
        padding: 3px;
      }

      .diff-symbol {
        width: 28px;
      }

      .diff-copy,
      .diff-link .external-icon {
        display: none;
      }

      .settings-toggle {
        width: 36px;
        padding: 0;
      }

      .settings-toggle span {
        display: none;
      }
    }

    @media (max-width: 800px) {
      .app {
        grid-template-rows: 100px 40px minmax(0, 1fr) 28px;
      }

      .topbar {
        display: grid;
        grid-template-columns: minmax(0, 1fr) max-content;
        grid-template-rows: 44px 36px;
        align-items: center;
        align-content: center;
        justify-content: normal;
        gap: 4px 8px;
        padding: 8px 10px;
      }

      .brand {
        order: initial;
        grid-column: 1;
        grid-row: 1;
        overflow: hidden;
      }

      .global-actions {
        order: initial;
        grid-column: 2;
        grid-row: 1;
        justify-self: end;
        margin-left: 0;
        min-width: max-content;
      }

      .desktop-layout-control {
        display: none;
      }

      .mobile-layout-control {
        order: initial;
        grid-column: 1 / -1;
        grid-row: 2;
        width: 100%;
        justify-content: center;
      }
    }

    @media (max-width: 520px) {
      .topbar {
        gap: 4px 6px;
        padding-inline: 8px;
      }

      .brand {
        gap: 6px;
      }

      .brand-type strong {
        font-size: 15px;
      }

      .global-actions {
        gap: 4px;
      }
    }

    @media (max-width: 480px) {
      .brand-type small {
        display: none;
      }

      .diff-link {
        position: relative;
        width: 32px;
        height: 30px;
        padding: 2px;
      }

      .diff-symbol {
        width: 26px;
        height: 24px;
      }

      .diff-copy {
        display: none;
      }

      .diff-link .external-icon {
        position: absolute;
        top: 3px;
        right: 3px;
        display: block;
        width: 8px;
        height: 8px;
        opacity: 0.82;
      }

      .settings-toggle {
        width: 30px;
        height: 30px;
        padding: 0;
      }

      .settings-toggle span {
        display: none;
      }
    }

    @media (max-width: 340px) {
      .brand-mark {
        width: 27px;
        height: 27px;
      }

      .brand-type strong {
        font-size: 14px;
      }

      .mobile-layout-control {
        justify-content: stretch;
      }

      .mobile-layout-control .control-label {
        display: none;
      }

      .mobile-layout-control .layout-switch {
        width: 100%;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .mobile-layout-control .layout-switch button {
        width: 100%;
        min-width: 0;
      }
    }

    body.startup-modal-open {
      overflow: hidden;
    }

    body.startup-modal-open .app {
      pointer-events: none;
      user-select: none;
    }

    /* Pin/fixed editing was intentionally removed. Keep stale markup inaccessible. */
    [data-action="lock"],
    [data-palette-action="lock"] {
      display: none !important;
    }

    .startup-overlay {
      position: fixed;
      z-index: 1000;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 20px;
      background: rgba(34, 31, 27, 0.12);
    }

    .startup-dialog {
      width: min(390px, 90vw);
      overflow: hidden;
      border: 1px solid rgba(87, 80, 70, 0.32);
      border-radius: 14px;
      background: rgba(255, 254, 250, 0.98);
      box-shadow: 0 20px 56px rgba(28, 25, 22, 0.18);
      color: var(--ink, #2d2925);
    }

    .startup-dialog-body {
      padding: 20px 20px 16px;
    }

    .startup-dialog h2 {
      margin: 0;
      font-size: 18px;
      line-height: 1.45;
      letter-spacing: -0.02em;
    }

    .startup-dialog p {
      margin: 7px 0 0;
      color: var(--muted, #746e65);
      font-size: 12px;
      line-height: 1.7;
    }

    .startup-dialog-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 0 20px 20px;
    }

    .startup-dialog button {
      min-height: 42px;
      border: 1px solid var(--line, #d7d1c7);
      border-radius: 9px;
      background: #f7f4ed;
      color: var(--ink, #2d2925);
      font: inherit;
      font-size: 12px;
      font-weight: 720;
      cursor: pointer;
    }

    .startup-dialog button:hover,
    .startup-dialog button:focus-visible {
      border-color: #aaa398;
      background: #fffdf8;
      outline: 2px solid rgba(75, 99, 170, 0.18);
      outline-offset: 2px;
    }

    .startup-dialog .startup-clear {
      border-color: rgba(150, 77, 61, 0.28);
      background: rgba(150, 77, 61, 0.06);
      color: #7f3f33;
    }

    @media (max-width: 520px) {
      .startup-overlay {
        padding: 14px;
      }

      .startup-dialog {
        width: min(380px, 90vw);
      }

      .startup-dialog-body {
        padding: 18px 16px 14px;
      }

      .startup-dialog-actions {
        grid-template-columns: 1fr;
        padding: 0 16px 16px;
      }
    }
  `;
  document.head.appendChild(headerResponsiveStyle);

  const STORAGE_KEY = "multimemos.workspace.v1";
  const DEFAULT_TITLES = ["欄1", "欄2", "欄3", "欄4"];
  const nativeStorageSetItem = Storage.prototype.setItem;
  let startupKeyHandler = null;

  // Register before the inline shortcut handler so the startup dialog can block
  // background keyboard commands while leaving the memo readable.
  window.addEventListener(
    "keydown",
    (event) => {
      if (!startupKeyHandler) return;
      event.stopImmediatePropagation();
      startupKeyHandler(event);
    },
    true,
  );

  const stripLockedFields = (workspace) => {
    if (!Array.isArray(workspace?.panes)) return workspace;
    workspace.panes.forEach((pane) => {
      if (pane && typeof pane === "object") delete pane.locked;
    });
    return workspace;
  };

  // Keep the retired `locked` field out of future localStorage writes even
  // though older app-core code still knows how to read it.
  Storage.prototype.setItem = function setItemWithoutRetiredLock(key, value) {
    if (this === localStorage && key === STORAGE_KEY) {
      try {
        const parsed = JSON.parse(value);
        stripLockedFields(parsed);
        value = JSON.stringify(parsed);
      } catch {
        // Fall through and preserve the original value if it is not JSON.
      }
    }
    return nativeStorageSetItem.call(this, key, value);
  };

  const load = (src, done) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = done;
    script.onerror = () => console.error(`[MultiMemos] failed to load ${src}`);
    document.head.appendChild(script);
  };

  const removeRetiredPinControls = () => {
    document.querySelectorAll('[data-action="lock"], [data-palette-action="lock"]').forEach((node) => node.remove());
  };

  const installRetiredPinCleanup = () => {
    removeRetiredPinControls();
    const workspace = document.querySelector("#workspace");
    if (!workspace) return;
    const observer = new MutationObserver(removeRetiredPinControls);
    observer.observe(workspace, { childList: true, subtree: true });
  };

  const loadApp = (afterCore) => {
    load("./app-core.js?v=20260820-no-pin-readable-startup", () => {
      installRetiredPinCleanup();
      afterCore?.();
      load("./enhancements.js?v=20260815-1747", () => {
        load("./visual-tweaks.js?v=20260815-1814", () => {
          load("./chatgpt-bridge.js?v=20260816-1842");
        });
      });
    });
  };

  const readSavedWorkspace = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw);
      return saved && typeof saved === "object" ? saved : null;
    } catch {
      return null;
    }
  };

  const hasPreviousMemo = (saved) =>
    Array.isArray(saved?.panes) &&
    saved.panes.some(
      (pane) =>
        Array.isArray(pane?.paragraphs) &&
        pane.paragraphs.some((text) => String(text).trim().length > 0),
    );

  const persistSanitizedWorkspace = (saved) => {
    if (!saved) return;
    stripLockedFields(saved);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  };

  const clearPreviousMemo = (saved) => {
    if (!Array.isArray(saved?.panes)) return;

    const originalLayout = [2, 3, 4].includes(saved.layout) ? saved.layout : 3;
    const layout4 = document.querySelector('[data-layout="4"]');
    if (layout4 && !layout4.classList.contains("active")) layout4.click();

    const rendered = [...document.querySelectorAll("#workspace .memo-pane")];
    rendered.forEach((paneNode, index) => {
      const title = paneNode.querySelector(".pane-title");
      const editor = paneNode.querySelector(".memo-editor");
      if (title) {
        title.value = DEFAULT_TITLES[index] || `欄${index + 1}`;
        title.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (editor) {
        editor.value = "";
        editor.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    if (originalLayout !== 4) {
      document.querySelector(`[data-layout="${originalLayout}"]`)?.click();
    }

    saved.layout = originalLayout;
    saved.panes = saved.panes.map((pane, index) => {
      const next = {
        ...pane,
        title: DEFAULT_TITLES[index] || `欄${index + 1}`,
        paragraphs: [""],
      };
      delete next.locked;
      return next;
    });
    persistSanitizedWorkspace(saved);
  };

  const showStartupPrompt = (saved) => {
    document.body.classList.add("startup-modal-open");

    const overlay = document.createElement("div");
    overlay.className = "startup-overlay";
    overlay.innerHTML = `
      <section class="startup-dialog" role="dialog" aria-modal="true" aria-labelledby="startupDialogTitle" aria-describedby="startupDialogDescription">
        <div class="startup-dialog-body">
          <h2 id="startupDialogTitle">前回のメモを削除しますか？</h2>
          <p id="startupDialogDescription">背景の前回メモを確認して、残すか新しく始めるか選べます。</p>
        </div>
        <div class="startup-dialog-actions">
          <button type="button" class="startup-keep">残す</button>
          <button type="button" class="startup-clear">削除して新しく始める</button>
        </div>
      </section>
    `;

    document.body.appendChild(overlay);

    const dialog = overlay.querySelector(".startup-dialog");
    const keepButton = overlay.querySelector(".startup-keep");
    const clearButton = overlay.querySelector(".startup-clear");
    const focusable = [keepButton, clearButton];

    const finish = (shouldClear) => {
      if (shouldClear) clearPreviousMemo(saved);
      startupKeyHandler = null;
      overlay.remove();
      document.body.classList.remove("startup-modal-open");
      if (shouldClear) document.querySelector("#workspace .memo-editor")?.focus();
    };

    startupKeyHandler = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish(false);
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        const current = focusable.indexOf(document.activeElement);
        const direction = event.shiftKey ? -1 : 1;
        const next = current < 0 ? 0 : (current + direction + focusable.length) % focusable.length;
        focusable[next].focus();
      }
    };

    keepButton.addEventListener("click", () => finish(false));
    clearButton.addEventListener("click", () => finish(true));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) finish(false);
    });
    dialog.addEventListener("click", (event) => event.stopPropagation());

    window.requestAnimationFrame(() => keepButton.focus());
  };

  const saved = readSavedWorkspace();
  if (saved) persistSanitizedWorkspace(saved);

  // Render the previous memo first so it stays readable behind the dialog.
  loadApp(() => {
    if (hasPreviousMemo(saved)) showStartupPrompt(saved);
  });
})();