(() => {
  const style = document.createElement("style");
  style.textContent = `
    /* 欄識別は01〜04だけに絞る。上辺アクセントと横の図形記号は使わない。 */
    .pane-accent,
    .pane-color-dot {
      display: none !important;
    }

    /* 視線移動を短くし、操作群を一定のリズムに揃える。 */
    .pane-header {
      grid-template-columns: minmax(80px, 1fr) auto;
      gap: 6px;
      padding: 9px 8px 8px 10px;
    }
    .pane-heading { gap: 7px; }
    .pane-title { padding-left: 2px; padding-right: 2px; }
    .pane-actions { gap: 3px; }
    .pane-more { margin-left: 2px; }

    .pane-actions > button,
    .pane-more > summary {
      width: 30px;
      height: 30px;
      border-radius: 6px;
      opacity: 1 !important;
      transform: none !important;
    }
    .pane-actions > .copy-all-action {
      width: auto;
      min-width: 72px;
      height: 30px;
      gap: 5px;
      padding: 0 8px;
    }

    /* 押す場所が逃げない。ホバー時も位置・角度を固定する。 */
    .pane-actions > button:hover:not(:disabled),
    .pane-actions > button:active:not(:disabled),
    .pane-more > summary:hover,
    .pane-more > summary:active,
    .pane-more[open] > summary,
    .pane-actions [data-action="lock"]:hover .icon,
    .pane-actions [data-action="copy"]:hover .icon,
    .pane-actions [data-action="focus"]:hover .icon,
    .pane-more > summary:hover .icon {
      transform: none !important;
    }

    /* 重要操作を薄く隠さず、常に同じ濃度で見せる。 */
    @media (hover: hover) and (pointer: fine) {
      .memo-pane .pane-actions > button,
      .memo-pane .pane-more > summary {
        opacity: 1 !important;
      }
    }

    /* スマホではラベルだけ畳み、操作そのものは残す。 */
    @media (max-width: 800px) {
      .pane-actions > .copy-all-action {
        width: 29px;
        min-width: 29px;
        padding: 0;
      }
      .copy-all-action .copy-action-label { display: none !important; }
      .app.mobile-two .pane-actions > button[data-action="copy"],
      .app.mobile-two .pane-actions > button[data-action="focus"] {
        display: inline-flex !important;
      }
    }
    @media (max-width: 420px) {
      .pane-actions > button[data-action="copy"] {
        display: inline-flex !important;
      }
    }
  `;
  document.head.appendChild(style);

  const template = document.querySelector("#paneTemplate");
  const workspace = document.querySelector("#workspace");
  const palette = document.querySelector("#shortcutPalette");
  const trigger = document.querySelector("#shortcutTrigger");

  const removePaneSymbols = (root) => {
    root?.querySelectorAll?.(".pane-color-dot").forEach((node) => node.remove());
  };
  removePaneSymbols(template?.content);
  removePaneSymbols(workspace);

  let lastPane = workspace?.querySelector(".memo-pane") || null;
  workspace?.addEventListener("focusin", (event) => {
    const pane = event.target.closest?.(".memo-pane");
    if (pane) lastPane = pane;
  });
  workspace?.addEventListener("pointerdown", (event) => {
    const pane = event.target.closest?.(".memo-pane");
    if (pane) lastPane = pane;
  });

  const closePalette = () => {
    if (palette && !palette.hidden) trigger?.click();
  };
  const currentPane = () => {
    if (lastPane?.isConnected) return lastPane;
    return workspace?.querySelector(".memo-pane") || null;
  };
  const clickCurrentClear = () => currentPane()?.querySelector("[data-enhanced-clear]")?.click();
  const clickCopyAll = () => document.querySelector("#copyAllPanes")?.click();
  const clickClearAll = () => document.querySelector("#clearAllPanes")?.click();

  const makeShortcut = (label, key, onClick) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "shortcut-item";
    button.innerHTML = `<span>${label}</span><kbd>${key}</kbd>`;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closePalette();
      onClick();
    });
    return button;
  };

  /* 操作速度優先：Ctrl+Mの2打目に、クリア／全欄操作も追加する。 */
  if (palette) {
    const groups = palette.querySelectorAll(".shortcut-group");
    const currentList = groups[1]?.querySelector(".shortcut-list");
    const workspaceList = groups[3]?.querySelector(".shortcut-list");
    if (currentList && !palette.querySelector("[data-fast-clear-current]")) {
      const item = makeShortcut("この欄をクリア", "X", clickCurrentClear);
      item.dataset.fastClearCurrent = "true";
      currentList.appendChild(item);
    }
    if (workspaceList && !palette.querySelector("[data-fast-copy-all]")) {
      const copyAll = makeShortcut("全欄コピー", "A", clickCopyAll);
      copyAll.dataset.fastCopyAll = "true";
      workspaceList.prepend(copyAll);

      const clearAll = makeShortcut("全欄クリア", "⇧ X", clickClearAll);
      clearAll.dataset.fastClearAll = "true";
      workspaceList.appendChild(clearAll);
    }
  }

  window.addEventListener(
    "keydown",
    (event) => {
      if (!palette || palette.hidden || event.ctrlKey || event.altKey || event.metaKey) return;
      if (!event.shiftKey && event.code === "KeyX") {
        event.preventDefault();
        event.stopImmediatePropagation();
        closePalette();
        clickCurrentClear();
        return;
      }
      if (!event.shiftKey && event.code === "KeyA") {
        event.preventDefault();
        event.stopImmediatePropagation();
        closePalette();
        clickCopyAll();
        return;
      }
      if (event.shiftKey && event.code === "KeyX") {
        event.preventDefault();
        event.stopImmediatePropagation();
        closePalette();
        clickClearAll();
      }
    },
    true,
  );
})();
