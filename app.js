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
  `;
  document.head.appendChild(headerResponsiveStyle);

  const load = (src, done) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = done;
    script.onerror = () => console.error(`[MultiMemos] failed to load ${src}`);
    document.head.appendChild(script);
  };

  load("./app-core.js?v=20260815-1747", () => {
    load("./enhancements.js?v=20260815-1747", () => {
      load("./visual-tweaks.js?v=20260815-1814", () => {
        load("./chatgpt-bridge.js?v=20260816-1842");
      });
    });
  });
})();