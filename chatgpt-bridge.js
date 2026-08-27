(() => {
  'use strict';

  const CHATGPT_URL = 'https://chatgpt.com/';
  const URL_LIMIT = 7000;
  const GLOBAL_ID = 'chatgpt-all-panes';
  const core = window.MultiMemosCore;

  const style = document.createElement('style');
  style.textContent = `
    .chatgpt-pane-action{width:auto!important;min-width:48px!important;gap:4px;padding:0 7px!important;border-color:rgba(var(--pane-accent-rgb),.22)!important;background:rgba(var(--pane-accent-rgb),.07)!important;color:var(--ink)!important;font-size:9px!important;font-weight:720!important}
    .chatgpt-pane-action:hover,.chatgpt-pane-action:focus-visible{background:rgba(var(--pane-accent-rgb),.14)!important}
    .chatgpt-pane-action__arrow{color:var(--muted);font-size:9px}
    #${GLOBAL_ID}{min-height:34px;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.42);color:var(--ink);font:inherit;font-size:10px;font-weight:700;white-space:nowrap;cursor:pointer}
    #${GLOBAL_ID}:hover,#${GLOBAL_ID}:focus-visible{background:rgba(255,255,255,.72)}
    #${GLOBAL_ID} small{color:var(--muted);font-size:8px;font-weight:620}
    @container (max-width:220px){.chatgpt-pane-action{min-width:30px!important;width:30px!important;padding:0!important}.chatgpt-pane-action__label{display:none}}
    @media (max-width:800px){#${GLOBAL_ID}{min-width:34px;padding:0 8px}#${GLOBAL_ID} small{display:none}}
  `;
  document.head.appendChild(style);

  function toast(message) {
    const el = document.querySelector('#toast');
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    clearTimeout(Number(el.dataset.gptTimer || 0));
    el.dataset.gptTimer = String(setTimeout(() => { el.hidden = true; }, 1800));
  }

  async function copy(text) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    const el = document.createElement('textarea');
    el.value = text;
    el.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    el.remove();
    if (!ok) throw new Error('copy failed');
  }

  function openChatGPT(prompt, label) {
    const text = String(prompt || '').trim();
    if (!text) return toast('送る内容がありません');
    const url = `${CHATGPT_URL}?prompt=${encodeURIComponent(text)}`;
    if (url.length <= URL_LIMIT) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    const opened = window.open(CHATGPT_URL, '_blank', 'noopener,noreferrer');
    void copy(text)
      .then(() => toast(`${label}をコピーしてChatGPTを開きました`))
      .catch(() => toast('ChatGPTは開きました。コピーに失敗しました'));
    if (!opened) toast('ポップアップがブロックされました');
  }

  function renderedPaneData(pane, fallbackIndex = 0) {
    return {
      id: pane.dataset.id || '',
      title: pane.querySelector('.pane-title')?.value?.trim() || `欄${fallbackIndex + 1}`,
      body: pane.querySelector('.memo-editor')?.value?.trim() || '',
    };
  }

  function panePrompt(pane) {
    const data = renderedPaneData(pane);
    return `【${data.title}】\n${data.body}`.trim();
  }

  function workspacePanes() {
    if (core?.getAllPaneData) {
      return core.getAllPaneData().map((pane, index) => ({
        id: pane.id,
        title: pane.title?.trim() || `欄${index + 1}`,
        body: pane.text?.trim() || '',
      }));
    }
    return [...document.querySelectorAll('.memo-pane')].map(renderedPaneData);
  }

  function allPrompt() {
    return workspacePanes()
      .filter(({ title, body }) => title || body)
      .map(({ title, body }) => `【${title}】\n${body}`.trim())
      .join('\n\n---\n\n');
  }

  function enhancePane(pane) {
    const actions = pane.querySelector('.pane-actions');
    if (!actions || actions.querySelector('.chatgpt-pane-action')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chatgpt-pane-action';
    button.title = '欄名と本文をChatGPTへ渡します';
    button.setAttribute('aria-label', 'この欄をChatGPTで話す');
    button.innerHTML = '<span class="chatgpt-pane-action__label">ChatGPT</span><span class="chatgpt-pane-action__arrow" aria-hidden="true">↗</span>';
    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      openChatGPT(panePrompt(pane), 'この欄');
    };
    const copyButton = actions.querySelector('[data-action="copy"]');
    copyButton ? copyButton.insertAdjacentElement('afterend', button) : actions.prepend(button);
  }

  function enhance() {
    document.querySelectorAll('.memo-pane').forEach(enhancePane);
    if (document.getElementById(GLOBAL_ID)) return;
    const actions = document.querySelector('.global-actions');
    if (!actions) return;
    const button = document.createElement('button');
    button.id = GLOBAL_ID;
    button.type = 'button';
    button.title = '各欄を欄名付きでまとめてChatGPTへ渡します';
    button.setAttribute('aria-label', '全欄をまとめてChatGPTで話す');
    button.innerHTML = '<span>ChatGPT ↗</span><small>全欄</small>';
    button.onclick = () => openChatGPT(allPrompt(), '全欄');
    actions.prepend(button);
  }

  function loadMarkdownMode() {
    if (window.MultiMemosMarkdown || document.querySelector('script[data-multimemos-markdown]')) return;
    if (!document.querySelector('link[data-multimemos-markdown-style]')) {
      const style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = './markdown-mode.css?v=20260827-pane-state-1';
      style.dataset.multimemosMarkdownStyle = 'true';
      document.head.appendChild(style);
    }
    const renderer = document.createElement('script');
    renderer.src = './markdown-renderer.js?v=20260826-1';
    renderer.async = false;
    renderer.dataset.multimemosMarkdown = 'true';
    renderer.onerror = () => console.error('[MultiMemos] failed to load Markdown renderer');
    renderer.onload = () => {
      const mode = document.createElement('script');
      mode.src = './markdown-mode.js?v=20260826-1';
      mode.async = false;
      mode.dataset.multimemosMarkdown = 'true';
      mode.onerror = () => console.error('[MultiMemos] failed to load Markdown mode');
      document.head.appendChild(mode);
    };
    document.head.appendChild(renderer);
  }

  window.addEventListener('multimemos:rendered', enhance);
  enhance();
  loadMarkdownMode();
})();
