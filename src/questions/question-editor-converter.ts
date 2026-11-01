/**
 * Safe round-trip and conversion utilities between legacy markdown markup
 * and P2-1 WYSIWYG editor content.
 *
 * Rules:
 * - Turkish characters (ç, ğ, ı, ö, ş, ü, İ, vb.) must be strictly preserved.
 * - XSS strings (<script>, onerror, javascript:) must NEVER be injected or executed.
 * - Existing markdown constructs (**bold**, _italic_, <u>underline</u>, lists, links)
 *   must be parsed safely into HTML for Tiptap and exported cleanly.
 */

import { safeStudioHref } from './studio-document';
import { geometryTokenPattern, readGeometryMarker } from './geometry-parameters';

export function sanitizeHtml(html: string): string {
  // Disallow scripts, iframe, object, embed, handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\son\w+\s*=/gi, ' data-blocked=');
}

/**
 * Converts legacy question markup into clean, safe HTML suitable for Tiptap.
 */
export function legacyMarkupToHtml(markdown: string): string {
  if (!markdown) return '<p></p>';

  const lines = markdown.split(/\r?\n/);
  const result: string[] = [];
  let inBulletList = false;
  let inOrderedList = false;

  const closeLists = () => {
    if (inBulletList) {
      result.push('</ul>');
      inBulletList = false;
    }
    if (inOrderedList) {
      result.push('</ol>');
      inOrderedList = false;
    }
  };

  const processInline = (text: string): string => {
    // Escape raw HTML entities first to prevent XSS
    let safe = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Restore safe <u> and </u> tags if they were in the original text
    safe = safe.replace(/&lt;u&gt;(.*?)&lt;\/u&gt;/g, '<u>$1</u>');

    // Bold: **text**
    safe = safe.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');

    // Italic: _text_
    safe = safe.replace(/_([^_\n]+)_/g, '<em>$1</em>');

    // Formula: $formula$
    safe = safe.replace(/\$([^$\n]+)\$/g, '<code>$$$1$$</code>');

    // Links: [text](https://...)
    safe = safe.replace(/\[([^\]\n]+)\]\(([^\s)]+)\)/g, (match, label, href) => {
      const validHref = safeStudioHref(href.replace(/&amp;/g, '&'));
      if (validHref) {
        return `<a href="${validHref}" target="_blank" rel="noopener noreferrer">${label}</a>`;
      }
      return match;
    });

    // Valid v1/v2 markers are visual, selectable Tiptap inline nodes.
    // Invalid/future markers stay literal text (never silently discarded).
    safe = safe.replace(geometryTokenPattern, marker =>
      readGeometryMarker(marker) ? '<span data-prolig-geometry="' + marker + '"></span>' : marker);

    return safe;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      closeLists();
      continue;
    }

    // Bullet list: - item or * item
    const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      if (inOrderedList) {
        result.push('</ol>');
        inOrderedList = false;
      }
      if (!inBulletList) {
        result.push('<ul>');
        inBulletList = true;
      }
      result.push(`<li>${processInline(bulletMatch[1])}</li>`);
      continue;
    }

    // Ordered list: 1. item
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      if (inBulletList) {
        result.push('</ul>');
        inBulletList = false;
      }
      if (!inOrderedList) {
        result.push('<ol>');
        inOrderedList = true;
      }
      result.push(`<li>${processInline(orderedMatch[2])}</li>`);
      continue;
    }

    // Regular paragraph
    closeLists();
    result.push(`<p>${processInline(trimmed)}</p>`);
  }

  closeLists();

  return result.join('') || '<p></p>';
}

/**
 * Converts HTML from Tiptap editor back into the system's canonical markdown text format.
 */
export function htmlToLegacyMarkup(html: string): string {
  if (!html) return '';

  // Use DOMParser in browser environment
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');
    return nodeToMarkdown(doc.body).trim();
  }

  // Fallback regex-based converter if DOMParser is unavailable
  return html
    // Preserve atomic geometry nodes in Node/SSR export too.
    .replace(/<span\b[^>]*data-prolig-geometry="([^"]+)"[^>]*><\/span>/gi,
      (_, marker: string) => readGeometryMarker(marker) ? marker : '')
    .replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (_, olContent) => {
      let index = 1;
      return olContent.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_2: string, item: string) => `${index++}. ${item.trim()}\n`) + '\n';
    })
    .replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, (_, ulContent) => {
      return ulContent.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_2: string, item: string) => `- ${item.trim()}\n`) + '\n';
    })
    .replace(/<strong\b[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b\b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em\b[^>]*>(.*?)<\/em>/gi, '_$1_')
    .replace(/<i\b[^>]*>(.*?)<\/i>/gi, '_$1_')
    .replace(/<u\b[^>]*>(.*?)<\/u>/gi, '@@U_START@@$1@@U_END@@')
    .replace(/<code\b[^>]*>(.*?)<\/code>/gi, (_, codeContent) => {
      const trimmed = codeContent.trim();
      return trimmed.startsWith('$') && trimmed.endsWith('$') ? trimmed : `$${trimmed}$`;
    })
    .replace(/<a\b[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/@@U_START@@/g, '<u>')
    .replace(/@@U_END@@/g, '</u>')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

function nodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const childrenMarkdown = Array.from(el.childNodes).map(nodeToMarkdown).join('');

  switch (tag) {
    case 'p':
      return `${childrenMarkdown}\n\n`;
    case 'strong':
    case 'b':
      return `**${childrenMarkdown}**`;
    case 'em':
    case 'i':
      return `_${childrenMarkdown}_`;
    case 'u':
      return `<u>${childrenMarkdown}</u>`;
    case 'span': {
      const marker = el.getAttribute('data-prolig-geometry');
      return marker && readGeometryMarker(marker) ? marker : childrenMarkdown;
    }
    case 'code':
      // Check if formula
      if (childrenMarkdown.startsWith('$') && childrenMarkdown.endsWith('$')) {
        return childrenMarkdown;
      }
      return `$${childrenMarkdown}$`;
    case 'a': {
      const href = el.getAttribute('href') || '';
      const valid = safeStudioHref(href);
      if (valid) {
        return `[${childrenMarkdown}](${valid})`;
      }
      return childrenMarkdown;
    }
    case 'ul': {
      const items = Array.from(el.children).map(li => `- ${nodeToMarkdown(li).trim()}`).join('\n');
      return `${items}\n\n`;
    }
    case 'ol': {
      const items = Array.from(el.children).map((li, idx) => `${idx + 1}. ${nodeToMarkdown(li).trim()}`).join('\n');
      return `${items}\n\n`;
    }
    case 'li':
      return childrenMarkdown;
    case 'br':
      return '\n';
    case 'body':
      return childrenMarkdown;
    default:
      return childrenMarkdown;
  }
}
