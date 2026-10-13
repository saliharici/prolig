/**
 * P1 document spike: a lossless, READ-ONLY bridge from legacy question markup.
 * The canonical API, question schema and write contract are intentionally unchanged.
 * Do not persist this format until versioned migrations and concurrency handling pass review.
 */
export type StudioInline =
  | { kind: 'text' | 'bold' | 'italic' | 'underline' | 'math'; text: string }
  | { kind: 'link'; text: string; href: string };

export type StudioBlock =
  | { kind: 'paragraph'; children: StudioInline[] }
  | { kind: 'list'; ordered: boolean; items: StudioInline[][] }
  | { kind: 'table'; columns: string[]; rows: string[][] };

export interface StudioDocumentV1 {
  schemaVersion: 1;
  sourceFormat: 'legacy-markup-v1';
  // Exact source values are kept, including Turkish characters, CRLF, empty lines
  // and unsupported markup. Reading/previewing must never rewrite a saved question.
  legacy: {
    content: string;
    options: string[];
    explanation: string;
    correctAnswer: string;
  };
  stem: StudioBlock[];
  choices: StudioBlock[][];
  explanation: StudioBlock[];
}

// Do not allow dangerous schemes, credentials, or protocol-relative URLs.
export function safeStudioHref(value: string): string | null {
  try {
    if (!/^https:\/\//i.test(value)) return null;
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

const inlineToken = /\*\*([^*\n]+)\*\*|_([^_\n]+)_|<u>([\s\S]*?)<\/u>|\$([^$\n]+)\$|\[([^\]\n]+)\]\(([^\s)]+)\)/g;

export function parseStudioInline(source: string): StudioInline[] {
  const nodes: StudioInline[] = [];
  let cursor = 0;
  const appendText = (text: string) => {
    if (!text) return;
    const last = nodes[nodes.length - 1];
    if (last?.kind === 'text') last.text += text;
    else nodes.push({ kind: 'text', text });
  };
  for (const match of source.matchAll(inlineToken)) {
    const position = match.index ?? 0;
    appendText(source.slice(cursor, position));
    if (match[1] !== undefined) nodes.push({ kind: 'bold', text: match[1] });
    else if (match[2] !== undefined) nodes.push({ kind: 'italic', text: match[2] });
    else if (match[3] !== undefined) nodes.push({ kind: 'underline', text: match[3] });
    else if (match[4] !== undefined) nodes.push({ kind: 'math', text: match[4] });
    else if (match[5] !== undefined) {
      const href = safeStudioHref(match[6]);
      if (href) nodes.push({ kind: 'link', text: match[5], href });
      else appendText(match[0]); // Preserve unsafe/unsupported markup as inert text.
    }
    cursor = position + match[0].length;
  }
  appendText(source.slice(cursor));
  return nodes;
}

function tableCells(source: string): string[] {
  const line = source.trim().replace(/^\|/, '').replace(/\|$/, '');
  // A literal escaped pipe is part of a cell.
  return line.split(/(?<!\\)\|/).map(cell => cell.replace(/\\\|/g, '|').trim());
}

function isTableSeparator(line: string, columns: number): boolean {
  const cells = tableCells(line);
  return columns >= 2 && cells.length === columns && cells.every(cell => /^:?-{3,}:?$/.test(cell));
}

export function parseStudioBlocks(source: string): StudioBlock[] {
  const lines = source.split(/\r?\n/);
  const blocks: StudioBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const trimmed = lines[index].trim();
    if (!trimmed) { index++; continue; }

    const headerCells = trimmed.includes('|') ? tableCells(trimmed) : [];
    if (index + 1 < lines.length && isTableSeparator(lines[index + 1], headerCells.length)) {
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].trim() && lines[index].includes('|')) {
        const cells = tableCells(lines[index]);
        if (cells.length !== headerCells.length) break;
        rows.push(cells);
        index++;
      }
      blocks.push({ kind: 'table', columns: headerCells, rows });
      continue;
    }

    const bullet = trimmed.match(/^(?:[-•])\s+(.+)$/);
    const numbered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      const items: StudioInline[][] = [];
      while (index < lines.length) {
        const current = lines[index].trim();
        const match = ordered ? current.match(/^\d+\.\s+(.+)$/) : current.match(/^(?:[-•])\s+(.+)$/);
        if (!match) break;
        items.push(parseStudioInline(match[1]));
        index++;
      }
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }

    // One paragraph per legacy nonempty line so old spacing semantics stay visible.
    blocks.push({ kind: 'paragraph', children: parseStudioInline(trimmed) });
    index++;
  }

  return blocks;
}

export function legacyQuestionToStudioDocument(input: {
  content: string;
  options: string[];
  explanation?: string | null;
  correctAnswer?: string | null;
}): StudioDocumentV1 {
  // Keep exact option strings; the legacy schema has exactly four single-answer choices.
  const options = Array.from({ length: 4 }, (_, index) => input.options[index] ?? '');
  const originalOptions = [...input.options];
  const explanation = input.explanation ?? '';
  return {
    schemaVersion: 1,
    sourceFormat: 'legacy-markup-v1',
    legacy: {
      content: input.content,
      options: originalOptions,
      explanation,
      correctAnswer: input.correctAnswer ?? ''
    },
    stem: parseStudioBlocks(input.content),
    choices: options.map(parseStudioBlocks),
    explanation: parseStudioBlocks(explanation)
  };
}

export function studioDocumentToLegacy(document: StudioDocumentV1) {
  if (document.schemaVersion !== 1 || document.sourceFormat !== 'legacy-markup-v1') {
    throw new Error('Unsupported question document version');
  }
  return {
    content: document.legacy.content,
    options: [...document.legacy.options],
    explanation: document.legacy.explanation,
    correctAnswer: document.legacy.correctAnswer
  };
}
