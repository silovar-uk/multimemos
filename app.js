(() => {
  // Header responsive guard.
  // The base stylesheet intentionally keeps the visual system compact, but the
  // header can run out of horizontal room before the mobile breakpoint. Keep
  // the layout deterministic here: progressively compact desktop controls, and
  // use an explicit two-row grid on narrow screens instead of flex wrapping.
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

    .startup-overlay {
      position: fixed;
      z-index: 1000;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 20px;
      background: rgba(34, 31, 27, 0.34);
      backdrop-filter: blur(5px);
    }

    .startup-dialog {
      width: min(420px, 90vw);
      overflow: hidden;
      border: 1px solid rgba(87, 80, 70, 0.28);
      border-radius: 14px;
      background: rgba(255, 254, 250, 0.99);
      box-shadow: 0 24px 72px rgba(28, 25, 22, 0.22);
      color: var(--ink, #2d2925);
    }

    .startup-dialog-body {
      padding: 22px 22px 18px;
    }

    .startup-dialog h2 {
      margin: 0;
      font-size: 18px;
      line-height: 1.45;
      letter-spacing: -0.02em;
    }

    .startup-dialog p {
      margin: 8px 0 0;
      color: var(--muted, #746e65);
      font-size: 12px;
      line-height: 1.7;
    }

    .startup-dialog-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 0 22px 22px;
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
        padding: 16px;
      }

      .startup-dialog {
        width: min(420px, 92vw);
      }

      .startup-dialog-body {
        padding: 20px 18px 16px;
      }

      .startup-dialog-actions {
        grid-template-columns: 1fr;
        padding: 0 18px 18px;
      }
    }
  `;
  document.head.appendChild(headerResponsiveStyle);

  const STORAGE_KEY = "multimemos.workspace.v1";
  const DEFAULT_TITLES = ["欄1", "欄2", "欄3", "欄4"];

  const load = (src, done) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = done;
    script.onerror = () => console.error(`[MultiMemos] failed to load ${src}`);
    document.head.appendChild(script);
  };

  const loadApp = () => {
    load("./app-core.js?v=20260820-startup-prompt", () => {
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

  const clearPreviousMemo = (saved) => {
    if (!Array.isArray(saved?.panes)) return;

    saved.panes = saved.panes.map((pane, index) => ({
      ...pane,
      title: DEFAULT_TITLES[index] || `欄${index + 1}`,
      paragraphs: [""],
      locked: false,
    }));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  };

  const showStartupPrompt = (saved) => {
    document.body.classList.add("startup-modal-open");

    const overlay = document.createElement("div");
    overlay.className = "startup-overlay";
    overlay.innerHTML = `
      <section class="startup-dialog" role="dialog" aria-modal="true" aria-labelledby="startupDialogTitle" aria-describedby="startupDialogDescription">
        <div class="startup-dialog-body">
          <h2 id="startupDialogTitle">前回のメモを削除しますか？</h2>
          <p id="startupDialogDescription">前回の内容を残して続けることも、新しいメモとして始めることもできます。</p>
        </div>
        <div class="startup-dialog-actions">
          <button type="button" class="startup-keep">残す</button>
          <button type="button" class="startup-clear">削除して新しく始める</button>
        </div>
      </section>
    `;

    document.body.appendChild(overlay);

    const keepButton = overlay.querySelector(".startup-keep");
    const clearButton = overlay.querySelector(".startup-clear");

    const finish = (shouldClear) => {
      if (shouldClear) clearPreviousMemo(saved);
      window.removeEventListener("keydown", onKeydown, true);
      overlay.remove();
      document.body.classList.remove("startup-modal-open");
      loadApp();
    };

    const onKeydown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      finish(false);
    };

    keepButton.addEventListener("click", () => finish(false));
    clearButton.addEventListener("click", () => finish(true));
    window.addEventListener("keydown", onKeydown, true);

    window.requestAnimationFrame(() => keepButton.focus());
  };

  const saved = readSavedWorkspace();
  if (hasPreviousMemo(saved)) {
    showStartupPrompt(saved);
  } else {
    loadApp();
  }
})();
