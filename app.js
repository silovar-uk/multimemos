(() => {
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
      load("./visual-tweaks.js?v=20260815-1814");
    });
  });
})();
