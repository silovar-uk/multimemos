(() => {
  'use strict';

  const STORAGE_KEY = 'multimemos.workspace.v1';
  const CHATGPT_BASE_URL = 'https://chatgpt.com/';
  const PROMPT_URL_LIMIT = 7000;
  const STYLE_ID = 'multimemos-chatgpt-bridge-style';
  const GLOBAL_BUTTON_ID = 'chatgpt-all-panes';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .chatgpt-pane-action {
        width: auto !important;
        min-width: 48px !important;
        gap: 4px;
        padding: 0 7px !important;
        border-color: rgba(var(--pane-accent-rgb), .22) !important;
        background: rgba(var(--pane-accent-rgb), .07) !important;
        color: var(--ink) !important;
        font-size: 9px !important;
        font-weight: 720 !important;
        letter-spacing: -.01em;
      }
      .chatgpt-pane-action:hover,
      .chatgpt-pane-action:focus-visible {
        background: rgba(var(--pane-accent-rgb), .14) !important;
      }
      .chatgpt-pane-action__arrow {
        color: var(--muted);
        font-size: 9px;
      }
      #${GLOBAL_BUTTON_ID} {
        min-height: 34px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 0 10px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: rgba(255,255,255,.42);
        color: var(--ink);
        font: inherit;
        font-size: 10px;
        font-weight: 700;
        white-space: nowrap;
        cursor: pointer;
      }
      #${GLOBAL_BUTTON_ID}:hover,
      #${GLOBAL_BUTTON_ID}:focus-visible {
        background: rgba(255,255,255,.72);
        border-color: color-mix(in srgb, var(--ink), var(--line) 72%);
      }
      #${GLOBAL_BUTTON_ID} small {
        color: var(--muted);
        font-size: 8px;
        font-weight: 620;
      }
      @container (max-width: 220px) {
        .chatgpt-pane-action {
          min-width: 30px !important;
          width: 30px !important;
          padding: 0 !important;
        }
        .chatgpt-pane-action__label { display: none; }
      }
      @media (max-width: 800px) {
        #${GLOBAL_BUTTON_ID} {
          min-width: 34px;
          padding: 0 8px;
        }
        #${GLOBAL_BUTTON_ID} small { display: none; }
      }
    `;
    document.head.appendChild(style);
  }

  function notify(message) {
    const toast = document.querySelector('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(Number(toast.dataset.chatgptTimer || 0));
    const timer = window.setTimeout(() => {
      toast.hidden = true;
      delete toast.dataset.chatgptTimer;
    }, 1800);
    toast.dataset.chatgptTimer = String(timer);
  }

  async function writeClipboard(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied) throw new Error('copy failed');
  }

  function chatGptUrl(prompt) {
    return `${CHATGPT_BASE_URL}?prompt=${encodeURIComponent(prompt)}`;
  }

  function openChatGPT(prompt, label) {
    const text = String(prompt || '').trim();
    if (!text) {
      notify('送る内容がありません');
      return;
    }

    const url = chatGptUrl(text);
    if (url.length <= PROMPT_URL_LIMIT) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    const popup = window.open(CHATGPT_BASE_URL, '_blank', 'noopener,noreferrer');
    void writeClipboard(text)
      .then(() => notify(`${label}をコピーしてChatGPTを開きました`))
      .catch(() => notify('ChatGPTは開きました。内容のコピーに失敗しました'));
    if (!popup) notify('ポップアップがブロックされました');
  }

  function panePrompt(pane) {
    const title = pane.querySelector('.pane-title')?.value?.trim() || '無題の欄';
    const body = pane.querySelector('.memo-editor')?.value?.trim() || '';
    return `【${title}】\n${body}`.trim();
  }

  function workspacePanes() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved?.panes?.length) {
        const count = [2, 3, 4].includes(saved.layout) ? saved.layout : saved.panes.length;
        return saved.panes.slice(0, count).map((pane, index) => ({
          title: String(pane?.title || `欄${index + 1}`).trim() || `欄${index + 1}`,
          body: Array.isArray(pane?.paragraphs) ? pane.paragraphs.join('\n\n').trim() : '',
        }));
      }
    } catch {
      // Fall through to the rendered panes.
    }

    return [...document.querySelectorAll('.memo-pane')].map((pane, index) => ({
      title: pane.querySelector('.pane-title')?.value?.trim() || `欄${index + 1}`,
      body: pane.querySelector('.memo-editor')?.value?.trim() || '',
    }));
  }

  function allPanesPrompt() {
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
    button.setAttribute('aria-label', 'この欄をChatGPTで話す');
    button.setAttribute('title', '欄名と本文をChatGPTへ渡します');
    button.innerHTML = '<span class="chatgpt-pane-action__label">ChatGPT</span><span class="chatgpt-pane-action__arrow" aria-hidden="true">↗</span>';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openChatGPT(panePrompt(pane), 'この欄');
    });

    const copyButton = actions.querySelector('[data-action="copy"]');
    if (copyButton) copyButton.insertAdjacentElement('afterend', button);
    else actions.prepend(button);
  }

  function enhanceGlobal() {
    if (document.getElementById(GLOBAL_BUTTON_ID)) return;
    const actions = document.querySelector('.global-actions');
    if (!actions) return;

    const button = document.createElement('button');
    button.id = GLOBAL_BUTTON_ID;
    button.type = 'button';
    button.setAttribute('aria-label', '表示欄をまとめてChatGPTで話す');
    button.setAttribute('title', '現在の表示欄を欄名付きでまとめてChatGPTへ渡します');
    button.innerHTML = '<span>ChatGPT ↗</span><small>全欄</small>';
    button.addEventListener('click', () => openChatGPT(allPanesPrompt(), '全欄'));

    actions.prepend(button);
  }

  function enhance() {
    injectStyles();
    enhanceGlobal();
    document.querySelectorAll('.memo-pane').forEach(enhancePane);
  }

  const observer = new MutationObserver(enhance);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  enhance();
})();
