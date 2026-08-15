(() => {
  const style = document.createElement("style");
  style.textContent = `
    .pane-accent {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
})();
