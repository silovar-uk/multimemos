(() => {
  'use strict';

  const STORAGE_KEY = 'multimemos.markdownView.v1';
  const EDIT = 'edit';
  const MARKDOWN = 'markdown';
  const core = window.MultiMemosCore;
  const renderer = window.MultiMemosMarkdownRenderer;
  const workspace = document.querySelector('#workspace');
  const globalActions = document.querySelector('.global-actions');

  if (!core || !renderer || !workspace || !globalActions) {
    console.error('[MultiMemos Markdown] required API is unavailable');
    return;
  }

  const paneIds = () => core.getAllPaneData().map((pane) => pane.id);

  const loadModes = () => {
    const modes = Object.fromEntries(paneIds().map((id) => [id, EDIT]));
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      Object.keys(modes).forEach((id) => { modes[id] = saved?.modes?.[id] === MARKDOWN ? MARKDOWN : EDIT; });
    } catch { /* Optional view state: malformed data falls back to edit. */ }
    return modes;
  };

  let modes = loadModes();
  let allButton = null;

  const saveModes = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, modes })); }
    catch (error) { console.warn('[MultiMemos Markdown] view state could not be saved', error); }
  };

  const modeFor = (id) => modes[id] === MARKDOWN ? MARKDOWN : EDIT;

  const allState = () => {
    const ids = paneIds();
    const count = ids.filter((id) => modeFor(id) === MARKDOWN).length;
    if (!count) return 'all-edit';
    return count === ids.length ? 'all-markdown' : 'mixed';
  };

  const syncAllButton = () => {
    if (!allButton) return;
    const state = allState();
    allButton.dataset.state = state;
    allButton.setAttribute('aria-pressed', state === 'mixed' ? 'mixed' : String(state === 'all-markdown'));
    const copy = state === 'all-markdown'
      ? ['全欄を編集表示に戻します', '全欄のMarkdown表示を終了して編集表示に戻す']
      : state === 'mixed'
        ? ['一部Markdown表示中。押すと全欄をMarkdown表示にします', '一部Markdown表示中。全欄をMarkdown表示にする']
        : ['全欄をMarkdown表示にします', '全欄をMarkdown表示にする'];
    allButton.title = copy[0];
    allButton.setAttribute('aria-label', copy[1]);
  };

  const paneText = (id, node) => {
    const editor = node?.querySelector('.memo-editor');
    if (editor && !editor.hidden) return editor.value;
    return core.getAllPaneData().find((pane) => pane.id === id)?.text ?? editor?.value ?? '';
  };

  const ensurePreview = (node) => {
    let preview = node.querySelector('.markdown-preview');
    if (preview) return preview;
    preview = document.createElement('div');
    preview.className = 'markdown-preview';
    preview.hidden = true;
    preview.tabIndex = 0;
    preview.setAttribute('role', 'region');
    node.querySelector('.memo-editor')?.insertAdjacentElement('afterend', preview);
    return preview;
  };

  const renderPreview = (node, id) => {
    const preview = ensurePreview(node);
    const index = Number(node.dataset.paneIndex || 0) + 1;
    const title = node.querySelector('.pane-title')?.value?.trim() || `欄${index}`;
    const text = paneText(id, node);
    preview.setAttribute('aria-label', `${title}のMarkdownプレビュー`);
    preview.innerHTML = text.trim() ? renderer.renderMarkdown(text) : '<p class="markdown-empty">Markdown preview</p>';
  };

  const syncPane = (node, force = false) => {
    const id = node?.dataset?.id;
    if (!id) return;
    const editor = node.querySelector('.memo-editor');
    const preview = ensurePreview(node);
    let button = node.querySelector('[data-action="markdown"]');

    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'markdown-toggle-action';
      button.dataset.action = 'markdown';
      button.textContent = 'MD';
      node.querySelector('[data-action="focus"]')?.insertAdjacentElement('beforebegin', button);
      button.addEventListener('click', () => {
        modes[id] = modeFor(id) === MARKDOWN ? EDIT : MARKDOWN;
        saveModes();
        syncPane(node, true);
        syncAllButton();
      });
    }

    const isMarkdown = modeFor(id) === MARKDOWN;
    node.dataset.viewMode = isMarkdown ? MARKDOWN : EDIT;
    button.classList.toggle('active', isMarkdown);
    button.setAttribute('aria-pressed', String(isMarkdown));
    button.dataset.tooltip = isMarkdown ? '編集表示' : 'Markdown表示';
    button.title = isMarkdown ? '本文の編集表示に戻します' : '本文をMarkdownとして表示します';
    button.setAttribute('aria-label', isMarkdown ? 'Markdown表示を終了して本文編集に戻る' : 'この欄をMarkdown表示にする');
    if (editor) editor.hidden = isMarkdown;
    preview.hidden = !isMarkdown;
    if (isMarkdown && (force || !preview.dataset.rendered)) {
      renderPreview(node, id);
      preview.dataset.rendered = 'true';
    }
  };

  const syncAll = () => {
    workspace.querySelectorAll('.memo-pane').forEach((node) => syncPane(node, true));
    syncAllButton();
  };

  const installAllButton = () => {
    allButton = document.querySelector('#markdownAllToggle');
    if (allButton) return;
    allButton = document.createElement('button');
    allButton.id = 'markdownAllToggle';
    allButton.type = 'button';
    allButton.className = 'markdown-all-toggle';
    allButton.innerHTML = '<span>MD</span><small>全欄</small>';
    globalActions.insertBefore(allButton, globalActions.querySelector('.settings-wrap'));
    allButton.addEventListener('click', () => {
      const next = allState() === 'all-markdown' ? EDIT : MARKDOWN;
      paneIds().forEach((id) => { modes[id] = next; });
      saveModes();
      syncAll();
    });
    syncAllButton();
  };

  workspace.addEventListener('click', (event) => {
    const clearButton = event.target.closest('[data-action="clear"]');
    if (!clearButton) return;
    const node = clearButton.closest('.memo-pane');
    if (node && modeFor(node.dataset.id) === MARKDOWN) queueMicrotask(() => syncPane(node, true));
  });

  workspace.addEventListener('input', (event) => {
    if (!event.target.matches?.('.pane-title')) return;
    const node = event.target.closest('.memo-pane');
    if (node && modeFor(node.dataset.id) === MARKDOWN) renderPreview(node, node.dataset.id);
  });

  document.querySelector('#shortcutPalette')?.addEventListener('click', (event) => {
    const paneButton = event.target.closest('[data-palette-pane]');
    if (!paneButton || paneButton.disabled) return;
    const index = Number(paneButton.dataset.palettePane);
    requestAnimationFrame(() => {
      const node = workspace.querySelectorAll('.memo-pane')[index];
      if (node && modeFor(node.dataset.id) === MARKDOWN) node.querySelector('.markdown-preview')?.focus();
    });
  });

  document.querySelector('.startup-clear')?.addEventListener('click', () => {
    paneIds().forEach((id) => { modes[id] = EDIT; });
    saveModes();
    queueMicrotask(syncAll);
  });

  window.addEventListener('multimemos:rendered', syncAll);
  installAllButton();
  syncAll();

  window.MultiMemosMarkdown = Object.freeze({
    renderMarkdown: renderer.renderMarkdown,
    getModes: () => ({ ...modes }),
    getAllState: allState,
    setPaneMode: (id, mode) => {
      if (!paneIds().includes(id) || ![EDIT, MARKDOWN].includes(mode)) return false;
      modes[id] = mode;
      saveModes();
      syncAll();
      return true;
    },
  });
})();
