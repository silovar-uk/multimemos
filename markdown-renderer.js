(() => {
  'use strict';

  const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const safeHref = (raw) => {
    try {
      const url = new URL(String(raw || '').trim(), window.location.href);
      return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol) ? url.href : null;
    } catch { return null; }
  };

  const inline = (source) => {
    const tokens = [];
    const hold = (html) => {
      const key = `\uE000MM${tokens.length}\uE001`;
      tokens.push([key, html]);
      return key;
    };
    let text = String(source ?? '');
    text = text.replace(/`([^`\n]+)`/g, (_, code) => hold(`<code>${esc(code)}</code>`));
    text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g, (_, label, rawUrl) => {
      const href = safeHref(rawUrl);
      return href ? hold(`<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${inline(label)}</a>`) : `${label} (${rawUrl})`;
    });
    text = text.replace(/<((?:https?:\/\/|mailto:)[^>\s]+)>/g, (_, rawUrl) => {
      const href = safeHref(rawUrl);
      return href ? hold(`<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(rawUrl)}</a>`) : rawUrl;
    });
    text = esc(text)
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');
    tokens.forEach(([key, html]) => { text = text.split(key).join(html); });
    return text;
  };

  const splitRow = (line) => {
    const cells = [];
    let cell = '', escaped = false;
    for (const char of String(line ?? '').trim().replace(/^\|/, '').replace(/\|$/, '')) {
      if (escaped) { cell += char; escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === '|') { cells.push(cell.trim()); cell = ''; continue; }
      cell += char;
    }
    cells.push(cell.trim());
    return cells;
  };

  const divider = (line) => {
    const cells = splitRow(line);
    if (!cells.length || !cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, '')))) return null;
    return cells.map((cell) => {
      const value = cell.replace(/\s/g, '');
      if (value.startsWith(':') && value.endsWith(':')) return 'center';
      return value.endsWith(':') ? 'right' : 'left';
    });
  };

  const listMatch = (line) => {
    const match = String(line ?? '').match(/^(\s*)([-+*]|\d+\.)\s+(.+)$/);
    if (!match) return null;
    return {
      indent: match[1].replace(/\t/g, '  ').length,
      type: /\d+\./.test(match[2]) ? 'ol' : 'ul',
      text: match[3],
    };
  };

  const listItem = (text) => {
    const task = String(text).match(/^\[([ xX])\]\s+(.*)$/);
    if (!task) return ['', inline(text)];
    const checked = task[1].toLowerCase() === 'x' ? ' checked' : '';
    return [' class="task-list-item"', `<label><input type="checkbox" disabled${checked}> <span>${inline(task[2])}</span></label>`];
  };

  const renderList = (lines, start, baseIndent = null) => {
    const first = listMatch(lines[start]);
    if (!first) return ['', start];
    const indent = baseIndent ?? first.indent;
    const type = first.type;
    let html = `<${type}>`, i = start, open = false;
    while (i < lines.length) {
      const item = listMatch(lines[i]);
      if (!item || item.indent < indent) break;
      if (item.indent > indent) {
        if (!open) break;
        const [nested, next] = renderList(lines, i, item.indent);
        html += nested; i = next; continue;
      }
      if (item.type !== type) break;
      if (open) html += '</li>';
      const [klass, body] = listItem(item.text);
      html += `<li${klass}>${body}`; open = true; i += 1;
    }
    if (open) html += '</li>';
    return [`${html}</${type}>`, i];
  };

  const special = (lines, i) => {
    const line = lines[i] ?? '';
    return !line.trim() || /^\s*```/.test(line) || /^\s{0,3}#{1,6}\s+/.test(line)
      || /^\s{0,3}>\s?/.test(line) || /^\s{0,3}((\*\s*){3,}|(-\s*){3,}|(_\s*){3,})$/.test(line)
      || Boolean(listMatch(line)) || (i + 1 < lines.length && line.includes('|') && Boolean(divider(lines[i + 1])));
  };

  const renderMarkdown = (source) => {
    const lines = String(source ?? '').replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i += 1; continue; }

      const fence = line.match(/^\s*```\s*([\w+-]*)\s*$/);
      if (fence) {
        const code = [];
        for (i += 1; i < lines.length && !/^\s*```\s*$/.test(lines[i]); i += 1) code.push(lines[i]);
        if (i < lines.length) i += 1;
        const lang = fence[1] ? ` class="language-${esc(fence[1])}"` : '';
        out.push(`<pre><code${lang}>${esc(code.join('\n'))}</code></pre>`);
        continue;
      }

      const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+)$/);
      if (heading) {
        const level = heading[1].length;
        out.push(`<h${level}>${inline(heading[2].replace(/\s+#+\s*$/, ''))}</h${level}>`);
        i += 1; continue;
      }

      if (/^\s{0,3}((\*\s*){3,}|(-\s*){3,}|(_\s*){3,})$/.test(line)) {
        out.push('<hr>'); i += 1; continue;
      }

      if (/^\s{0,3}>\s?/.test(line)) {
        const quote = [];
        while (i < lines.length && /^\s{0,3}>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^\s{0,3}>\s?/, ''));
        out.push(`<blockquote>${renderMarkdown(quote.join('\n'))}</blockquote>`); continue;
      }

      const align = i + 1 < lines.length && line.includes('|') ? divider(lines[i + 1]) : null;
      if (align) {
        const header = splitRow(line), rows = [];
        i += 2;
        while (i < lines.length && lines[i].trim() && lines[i].includes('|') && !special(lines, i)) rows.push(splitRow(lines[i++]));
        const cols = Math.max(header.length, align.length);
        const cells = (row, tag) => Array.from({ length: cols }, (_, n) => `<${tag} style="text-align:${align[n] || 'left'}">${inline(row[n] || '')}</${tag}>`).join('');
        out.push(`<div class="markdown-table-wrap"><table><thead><tr>${cells(header, 'th')}</tr></thead><tbody>${rows.map((row) => `<tr>${cells(row, 'td')}</tr>`).join('')}</tbody></table></div>`);
        continue;
      }

      if (listMatch(line)) {
        const [html, next] = renderList(lines, i);
        out.push(html); i = next; continue;
      }

      const paragraph = [line.trim()];
      i += 1;
      while (i < lines.length && lines[i].trim() && !special(lines, i)) paragraph.push(lines[i++].trim());
      out.push(`<p>${paragraph.map(inline).join('<br>')}</p>`);
    }
    return out.join('\n');
  };

  window.MultiMemosMarkdownRenderer = Object.freeze({ renderMarkdown });
})();
