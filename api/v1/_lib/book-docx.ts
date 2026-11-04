import { parseStudioBlocks, type StudioBlock, type StudioInline } from '../../../src/questions/studio-document.js';
import { containsGeometryMarkup, splitGeometryMarkup } from '../../../src/questions/geometry-markup.js';
import { knownGeometryOnly, wordGeometryDrawing } from './docx-geometry.js';
import { prepareTrustedDocxPngs, privatePngWordDrawing, privatePngRelationshipEntries, type TrustedDocxPrivatePng, type PreparedPrivateDocxPng } from './docx-private-png.js';
import type { FrozenBookQuestionV1 } from '../../../src/publishing/book-draft-contract.js';

/**
 * Minimal standards-compliant, editable WordprocessingML package.
 * Text, 4/5-option MCQ, true/false, open questions, basic emphasis, lists
 * and tables are supported. Unsafe/lossy rich content is rejected upfront.
 * No HTML injection, external download, or user-provided ZIP entries.
 */
export type DocxBook = {
  id: number;
  title: string;
  layoutColumns: number;
  chapters: Array<{
    title: string;
    sortOrder: number;
    questions: Array<{ sortOrder: number; snapshot: FrozenBookQuestionV1 }>;
  }>;
};

export class DocxExportError extends Error {
  constructor(message: string) { super(message); this.name = 'DocxExportError'; }
}

function safeText(input: string): string {
  // XML 1.0 valid characters. Keep all Turkish glyphs intact.
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function run(value: string, flags = ''): string {
  return '<w:r>' + (flags ? '<w:rPr>' + flags + '</w:rPr>' : '') +
    '<w:t xml:space="preserve">' + safeText(value) + '</w:t></w:r>';
}
function p(text: string, style = ''): string {
  return '<w:p>' + (style ? '<w:pPr><w:pStyle w:val="' + style + '"/></w:pPr>' : '') +
    run(text) + '</w:p>';
}
// RELEASE07B-WORDMATH-01: editable OMML for bounded math syntax.
// Preserve the exact stored expression. Unsupported operations are rejected,
// never flattened to misleading plain text.
function mathAtom(value: string): string {
  const source = value.trim();
  if (!source || !/^[\p{L}\p{N}\s+\-=×÷·.,()]+$/u.test(source))
    throw new DocxExportError('Matematik ifadesinin Word denklem dizgisi henüz desteklenmiyor.');
  return '<m:r><m:t xml:space="preserve">' + safeText(source) + '</m:t></m:r>';
}

function inlineMathXml(value: string): string {
  const source = value.trim();
  const unsupported = (): never => {
    throw new DocxExportError('Matematik ifadesinin Word denklem dizgisi henüz desteklenmiyor.');
  };
  if (!source || source.length > 500) return unsupported();
  // Backward compatibility: plain algebra is emitted as one editable math run.
  if (/^[\p{L}\p{N}\s+\-=×÷·.,()]+$/u.test(source)) {
    return '<m:oMath>' + mathAtom(source) + '</m:oMath>';
  }
  const glyphs: Record<string, string> = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', theta: 'θ',
    pi: 'π', lambda: 'λ', mu: 'μ', sigma: 'σ', omega: 'ω',
    Delta: 'Δ', Sigma: 'Σ', Omega: 'Ω',
    infty: '∞', infinity: '∞',
    times: '×', cdot: '·', div: '÷', pm: '±', mp: '∓',
    le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠',
    approx: '≈',
  };
  const atom = (s: string): string => '<m:r><m:t xml:space="preserve">' + safeText(s) + '</m:t></m:r>';
  const readGroup = (input: string, start: number): { body: string; end: number } => {
    if (input[start] !== '{') return unsupported();
    let depth = 0;
    for (let i = start; i < input.length; i++) {
      if (input[i] === '{') depth++;
      if (input[i] === '}') {
        depth--;
        if (depth === 0) return { body: input.slice(start + 1, i), end: i + 1 };
      }
    }
    return unsupported();
  };
  const parse = (input: string, level = 0): string => {
    if (!input || input.length > 500 || level > 12) return unsupported();
    const pieces: string[] = [];
    let i = 0;
    while (i < input.length) {
      const char = input[i];
      if (char === '\\') {
        const command = /^\\([A-Za-z]+)/.exec(input.slice(i));
        if (!command) return unsupported();
        i += command[0].length;
        if (command[1] === 'frac') {
          const numerator = readGroup(input, i);
          const denominator = readGroup(input, numerator.end);
          pieces.push('<m:f><m:num>' + parse(numerator.body, level + 1) +
            '</m:num><m:den>' + parse(denominator.body, level + 1) + '</m:den></m:f>');
          i = denominator.end;
          continue;
        }
        if (command[1] === 'sqrt') {
          let degree = '';
          if (input[i] === '[') {
            const end = input.indexOf(']', i + 1);
            if (end < 0 || end - i > 12) return unsupported();
            degree = input.slice(i + 1, end);
            if (!/^[1-9][0-9]?$/.test(degree)) return unsupported();
            i = end + 1;
          }
          const radicand = readGroup(input, i);
          pieces.push('<m:rad><m:radPr><m:degHide m:val="' + (degree ? '0' : '1') +
            '"/></m:radPr><m:deg>' + (degree ? atom(degree) : '') + '</m:deg><m:e>' +
            parse(radicand.body, level + 1) + '</m:e></m:rad>');
          i = radicand.end;
          continue;
        }
        const replacement = glyphs[command[1]];
        if (replacement === undefined) return unsupported();
        pieces.push(atom(replacement));
        continue;
      }
      if (char === '^' || char === '_') {
        if (pieces.length === 0 || i + 1 >= input.length) return unsupported();
        const isSuper = char === '^';
        const script = input[i + 1] === '{'
          ? readGroup(input, i + 1)
          : { body: input[i + 1], end: i + 2 };
        if (!script.body || /[{}^_]/.test(script.body[0])) return unsupported();
        const argument = parse(script.body, level + 1);
        let base = pieces.pop()!;
        let sup: string | null = isSuper ? argument : null;
        let sub: string | null = isSuper ? null : argument;
        i = script.end;
        // x_1^2 and x^2_1 become one native Word sub/sup expression.
        if ((input[i] === '^' || input[i] === '_') && (input[i] === '^') !== isSuper) {
          const secondIsSuper = input[i] === '^';
          const next = input[i + 1] === '{'
            ? readGroup(input, i + 1)
            : { body: input[i + 1] || '', end: i + 2 };
          if (!next.body || /[{}^_]/.test(next.body[0])) return unsupported();
          const second = parse(next.body, level + 1);
          if (secondIsSuper) sup = second;
          else sub = second;
          i = next.end;
        }
        if (sup !== null && sub !== null) {
          base = '<m:sSubSup><m:e>' + base + '</m:e><m:sub>' + sub +
            '</m:sub><m:sup>' + sup + '</m:sup></m:sSubSup>';
        } else if (sup !== null) {
          base = '<m:sSup><m:e>' + base + '</m:e><m:sup>' + sup + '</m:sup></m:sSup>';
        } else {
          base = '<m:sSub><m:e>' + base + '</m:e><m:sub>' + sub + '</m:sub></m:sSub>';
        }
        pieces.push(base);
        continue;
      }
      if (char === '{') {
        const group = readGroup(input, i);
        pieces.push(parse(group.body, level + 1));
        i = group.end;
        continue;
      }
      if (char === '}' || char === '$' || char === '&' || char === '<' || char === '>') return unsupported();
      if (!/^[\p{L}\p{N}\s+\-=×÷·.,()±≤≥≠≈∞∑∫*\[\]]$/u.test(char)) return unsupported();
      pieces.push(atom(char === '*' ? '×' : char));
      i++;
    }
    return pieces.join('');
  };
  return '<m:oMath>' + parse(source) + '</m:oMath>';
}
type DrawingSequence = { nextId: number };
function paragraphRuns(nodes: StudioInline[], drawings: DrawingSequence, style = ''): string {
  // WORD-LAYOUT-01: layout-only separation of independent math runs. Never
  // rewrite the frozen question or change the editable OMML expressions.
  const sections: string[] = [];
  let buffer = '';
  let hasMath = false;
  let previousTail: 'math' | 'word' | 'other' | null = null;
  const styleXml = style ? '<w:pPr><w:pStyle w:val="' + style + '"/></w:pPr>' : '';
  const mathGap = (betweenEquations = false) => run(betweenEquations ? '\u2002' : '\u2009'); // en/thin typographic space, outside OMML
  const flush = () => {
    if (!buffer) return;
    // Fractions/radicals may need a taller automatic line and more breathing room.
    const paragraphProperties = (style ? '<w:pStyle w:val="' + style + '"/>' : '') +
      (hasMath ? '<w:widowControl/><w:spacing w:before="45" w:after="125" w:line="330" w:lineRule="auto"/>' : '');
    sections.push('<w:p>' + (paragraphProperties ? '<w:pPr>' + paragraphProperties + '</w:pPr>' : '') + buffer + '</w:p>');
    buffer = '';
    hasMath = false;
    previousTail = null;
  };
  for (const node of nodes) {
    let flags = '';
    if (node.kind === 'bold') flags = '<w:b/>';
    if (node.kind === 'italic') flags = '<w:i/>';
    if (node.kind === 'underline') flags = '<w:u w:val="single"/>';
    if (node.kind === 'math') {
      if (previousTail === 'math' || previousTail === 'word') buffer += mathGap(previousTail === 'math');
      buffer += inlineMathXml(node.text);
      hasMath = true;
      previousTail = 'math';
      continue;
    }
    for (const piece of splitGeometryMarkup(node.text)) {
      if (piece.kind === 'text' && piece.value) {
        // Do not insert whitespace before punctuation or when one already exists.
        if (previousTail === 'math' && /^[\p{L}\p{N}(\u221a]/u.test(piece.value)) buffer += mathGap();
        buffer += run(piece.value, flags);
        previousTail = /[\p{L}\p{N})\]}]/u.test(piece.value.slice(-1)) ? 'word' : 'other';
      } else if (piece.kind !== 'text') {
        flush();
        sections.push('<w:p><w:pPr><w:keepLines/><w:spacing w:before="75" w:after="75"/></w:pPr>' +
          wordGeometryDrawing(piece.shape, drawings.nextId++, piece.values, piece.labels) + '</w:p>');
      }
    }
  }
  flush();
  return sections.join('') || '<w:p>' + styleXml + '</w:p>';
}
function cell(text: string, header = false): string {
  return '<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>' +
    p(text, header ? 'TableHead' : '') + '</w:tc>';
}
function blocksToXml(blocks: StudioBlock[], drawings: DrawingSequence): string {
  return blocks.map(block => {
    if (block.kind === 'paragraph') return paragraphRuns(block.children, drawings);
    if (block.kind === 'list') return block.items.map((item, i) =>
      paragraphRuns([{ kind: 'text', text: (block.ordered ? String(i + 1) + '. ' : '• ') }, ...item], drawings, 'ListParagraph')).join('');
    const border = '<w:tblPr><w:tblBorders><w:bottom w:val="single" w:sz="4"/><w:top w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr>';
    const header = '<w:tr>' + block.columns.map(x => cell(x, true)).join('') + '</w:tr>';
    const rows = block.rows.map(row => '<w:tr>' + row.map(x => cell(x)).join('') + '</w:tr>').join('');
    const grid = '<w:tblGrid>' + block.columns.map(() => '<w:gridCol w:w="1800"/>').join('') + '</w:tblGrid>';
    return '<w:tbl>' + border + grid + header + rows + '</w:tbl>';
  }).join('');
}
function contentXml(value: string, drawings: DrawingSequence): string {
  return blocksToXml(parseStudioBlocks(value), drawings);
}
function optionXml(value: string, index: number, drawings: DrawingSequence): string {
  const label = String.fromCharCode(65 + index) + ') ';
  const blocks = parseStudioBlocks(value);
  // Keep the option label in the same editable paragraph as its first text run.
  if (blocks[0]?.kind === 'paragraph') {
    const [first, ...rest] = blocks;
    return paragraphRuns([{ kind: 'text', text: label }, ...first.children], drawings, 'QuestionOption') + blocksToXml(rest, drawings);
  }
  // Tables cannot share a paragraph with text; retain the label before the table.
  return p(label, 'QuestionOption') + blocksToXml(blocks, drawings);
}
function pageBreak(): string { return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'; }
function coverSectionBreak(): string {
  // The paragraph-level section properties belong to the preceding cover.
  // The document-level sectPr configures the subsequent question pages.
  return '<w:p><w:pPr><w:sectPr><w:type w:val="nextPage"/>' +
    '<w:pgSz w:w="11906" w:h="16838"/>' +
    '<w:pgMar w:top="1250" w:right="1200" w:bottom="1250" w:left="1200" w:header="500" w:footer="500" w:gutter="0"/>' +
    '<w:cols w:num="1"/></w:sectPr></w:pPr></w:p>';
}
// Keep a numbered question label together with the opening line of its stem.
function questionLabel(number: number): string {
  return '<w:p><w:pPr><w:pStyle w:val="QuestionLabel"/><w:keepNext/></w:pPr>' + run(String(number) + '. Soru') + '</w:p>';
}

function validate(book: DocxBook): void {
  if (!Number.isSafeInteger(book.id) || book.id < 1 || typeof book.title !== 'string' ||
      !book.title.trim() || book.title.length > 120)
    throw new DocxExportError('Kitap başlığı veya kimliği geçersiz.');
  if (book.layoutColumns !== 1 && book.layoutColumns !== 2)
    throw new DocxExportError('Word düzeni yalnız tek veya çift sütun olabilir.');
  const chapters = book.chapters;
  if (!Array.isArray(chapters) || chapters.some(c => !c || typeof c.title !== 'string' ||
      !Array.isArray(c.questions) || !Number.isSafeInteger(c.sortOrder))) {
    throw new DocxExportError('Kitap bölümlerinin kayıt biçimi geçersiz.');
  }
  const items = chapters.flatMap(c => c.questions);
  if (!chapters.length || chapters.length > 30 || !items.length || items.length > 300)
    throw new DocxExportError('Word için 1–30 bölüm ve 1–300 soru gereklidir.');
  for (const item of items) {
    const q = item.snapshot;
    if (!q || q.schemaVersion !== 1 || typeof q.content !== 'string' || !q.content.trim() ||
        !Array.isArray(q.assets) || !Array.isArray(q.options) ||
        typeof q.questionType !== 'string') {
      throw new DocxExportError('Kaydedilmiş sorunun sürüm biçimi desteklenmiyor.');
    }
    if (q.imageUrl || q.assets.length)
      throw new DocxExportError('Görsel veya medya içeren sorular bu Word sürümünde desteklenmiyor. Eksik çıktı verilmedi.');
    // These snapshot fields are not drawn in the current question pages.
    // Never silently accept diagram data in a field that the DOCX skips.
    if ([q.explanation, q.modelAnswer, q.scoringRubric, q.evaluationCriteria].some(
      value => typeof value === 'string' && containsGeometryMarkup(value)
    )) throw new DocxExportError('Word nüshasına yazılmayan çözüm veya ölçüt alanlarında geometrik şekil bulunuyor.');
    if (q.questionType !== 'MULTIPLE_CHOICE' && q.options.some(value => containsGeometryMarkup(value))) {
      throw new DocxExportError('Word nüshasına yazılmayan cevap seçeneğinde geometrik şekil bulunuyor.');
    }

    for (const value of [q.content, ...q.options, q.explanation ?? '', q.modelAnswer ?? '']) {
      if (!knownGeometryOnly(value))
        throw new DocxExportError('Bilinmeyen geometrik şekil sürümü Word belgesine aktarılmadı.');
      // Math expressions must not silently become source TeX in a publishing document.
      if (['\\(', '\\['].some(token => value.includes(token)))
        throw new DocxExportError('Matematik ifadesinin Word denklem dizgisi henüz desteklenmiyor.');
      const blocks = parseStudioBlocks(value);
      for (const block of blocks) {
        if (block.kind === 'table' &&
            [...block.columns, ...block.rows.flat()].some(x => x.includes('$') || x.includes('\\') || containsGeometryMarkup(x)))
          throw new DocxExportError('Tablo içindeki matematik dizgisi henüz desteklenmiyor.');
        const inlineGroups = block.kind === 'paragraph' ? [block.children] :
          block.kind === 'list' ? block.items : [];
        for (const nodes of inlineGroups) for (const node of nodes) {
          if (node.kind === 'link') throw new DocxExportError('Word dönüştürmede bağlantı desteklenmiyor.');
          if (node.kind === 'math') inlineMathXml(node.text);
        }
      }
      if (value.includes('$') && !blocks.some(block =>
        (block.kind === 'paragraph' ? block.children : block.kind === 'list' ? block.items.flat() : [])
          .some(node => node.kind === 'math')))
        throw new DocxExportError('Matematik ifadesinin Word denklem dizgisi henüz desteklenmiyor.');
    }
    if (q.questionType === 'MULTIPLE_CHOICE') {
      if (![4,5].includes(q.options.length) || typeof q.correctAnswer !== 'string' ||
          q.correctAnswer.length !== 1 || !'ABCDE'.slice(0, q.options.length).includes(q.correctAnswer))
        throw new DocxExportError('Çoktan seçmeli sorunun seçenek/cevap anahtarı eksik.');
    } else if (q.questionType === 'TRUE_FALSE') {
      if (typeof q.booleanAnswer !== 'boolean') throw new DocxExportError('Doğru/Yanlış cevabı eksik.');
    } else if (q.questionType === 'OPEN_ENDED') {
      if (!q.modelAnswer?.trim()) throw new DocxExportError('Açık uçlu sorunun model cevabı eksik.');
    } else throw new DocxExportError('Desteklenmeyen soru türü.');
  }
}

/**
 * Word may split one question's final answers onto a mostly empty next page,
 * even when the entire item would fit on its own page. Keep a moderate-size,
 * paragraph-only question together so the renderer can move it as a unit.
 *
 * Tables and unusually long questions use the legacy flow; attempting to
 * keep a table / multi-page question intact can result in oversized pages.
 * No content, image relationships or answer text is rewritten here.
 */
function keepQuestionOnOnePage(parts: readonly string[], layoutColumns: number): string {
  const xml = parts.join('');
  if (xml.includes('<w:tbl>')) return xml;
  const paragraphs = xml.match(/<w:p>[\s\S]*?<\/w:p>/g);
  if (!paragraphs || !paragraphs.length || paragraphs.join('') !== xml) return xml;
  // A hard chain of keepNext on a long question can create enormous blank
  // columns/pages. Reserve the whole-question rule for modest-size questions.
  const visibleText = [...xml.matchAll(/<(?:w|m):t(?:\s[^>]*)?>([\s\S]*?)<\/(?:w|m):t>/g)]
    .reduce((sum, match) => sum + match[1].length, 0);
  const drawings = (xml.match(/<w:drawing>/g) || []).length;
  const mathGroups = (xml.match(/<m:oMath>/g) || []).length;
  const estimatedLines = paragraphs.length + Math.ceil(visibleText / (layoutColumns === 2 ? 34 : 70)) +
    drawings * 7 + mathGroups * 0.3;
  // Moderate vector-geometric questions can fit one A4 column even when
  // their line estimate is inflated by two drawings and several OMML items.
  // Keep these intact; never force oversized questions or private PNGs into
  // one column, since those must be allowed to flow naturally.
  const moderateGeometry = layoutColumns === 2 &&
    paragraphs.length <= 12 && drawings >= 1 && drawings <= 2 &&
    mathGroups <= 10 && visibleText <= 180 && estimatedLines <= 32 &&
    !xml.includes('<a:blip');
  const keepTogether = paragraphs.length <= 14 &&
    (estimatedLines <= (layoutColumns === 2 ? 18 : 34) || moderateGeometry);
  // In a long question, keep a short A–D/E option group in one column.
  // The question itself may still continue naturally across columns/pages.
  const optionStarts = paragraphs.flatMap((paragraph, index) => {
    const firstText = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/.exec(paragraph)?.[1] ?? '';
    return /^[A-E]\) /.test(firstText) ? [index] : [];
  });
  const optionStart = optionStarts.length >= 4 ? optionStarts[0] : -1;
  const optionXml = optionStart >= 0 ? paragraphs.slice(optionStart).join('') : '';
  const optionText = [...optionXml.matchAll(/<(?:w|m):t(?:\s[^>]*)?>([\s\S]*?)<\/(?:w|m):t>/g)]
    .reduce((sum, match) => sum + match[1].length, 0);
  const optionDrawings = (optionXml.match(/<w:drawing>/g) || []).length;
  const optionLines = (optionStart >= 0 ? paragraphs.length - optionStart : 0) +
    Math.ceil(optionText / (layoutColumns === 2 ? 34 : 70)) + optionDrawings * 7;
  const groupOptions = layoutColumns === 2 && !keepTogether &&
    optionStart >= 0 && optionLines <= 12;
  return paragraphs.map((paragraph, index) => {
    // If it won't safely fit, keep only its question number with the next
    // paragraph; individual paragraphs still resist line/orphan splitting.
    const keepNext = (keepTogether && index < paragraphs.length - 1) || index === 0 ||
      (groupOptions && index >= optionStart && index < paragraphs.length - 1);
    const paragraphLength = [...paragraph.matchAll(/<(?:w|m):t(?:\s[^>]*)?>([\s\S]*?)<\/(?:w|m):t>/g)]
      .reduce((sum, match) => sum + match[1].length, 0);
    const keepLines = paragraphLength <= (layoutColumns === 2 ? 110 : 220);
    const hasProperties = paragraph.startsWith('<w:p><w:pPr>');
    const flags = (keepNext ? '<w:keepNext/>' : '') + (keepLines ? '<w:keepLines/>' : '') + '<w:widowControl/>';
    if (!hasProperties) {
      return paragraph.replace('<w:p>', '<w:p><w:pPr>' + flags + '</w:pPr>');
    }
    const closing = paragraph.indexOf('</w:pPr>');
    if (closing < 0) return paragraph;
    // OOXML paragraph properties must preserve schema ordering:
    // pStyle, keepNext, keepLines, widowControl, spacing. Existing flags
    // from questionLabel/geometry must not be moved after incompatible tags.
    const openEnd = '<w:p><w:pPr>'.length;
    const originalProperties = paragraph.slice(openEnd, closing);
    const plainFlags = /<w:(?:keepNext|keepLines|widowControl)\/>/g;
    const unknownFlags = originalProperties.replace(plainFlags, '');
    // Do not rewrite customized pagination controls not produced by this module.
    if (/<w:(?:keepNext|keepLines|widowControl)\b[^>]*>/.test(unknownFlags)) return paragraph;
    const effectiveNext = keepNext || originalProperties.includes('<w:keepNext/>');
    const effectiveLines = keepLines || originalProperties.includes('<w:keepLines/>');
    const effectiveWidow = true;
    const styleMatch = /^<w:pStyle\b[^>]*\/>/.exec(unknownFlags);
    const splitAt = styleMatch ? styleMatch[0].length : 0;
    const pagination = (effectiveNext ? '<w:keepNext/>' : '') +
      (effectiveLines ? '<w:keepLines/>' : '') +
      (effectiveWidow ? '<w:widowControl/>' : '');
    const orderedProperties = unknownFlags.slice(0, splitAt) + pagination + unknownFlags.slice(splitAt);
    return paragraph.slice(0, openEnd) + orderedProperties + paragraph.slice(closing);
  }).join('');
}

function buildDocument(book: DocxBook, includeAnswers: boolean, images: PreparedPrivateDocxPng[] = []): string {
  const ordered = [...book.chapters].sort((a, b) => a.sortOrder - b.sortOrder);
  const drawings: DrawingSequence = { nextId: 1 };
  let count = 0;
  const answerRows: string[] = [];
  const body: string[] = [
    p('PRO-LİG  /  YAYIN HAZIRLIK', 'Subtitle'),
    p('SORU KİTABI', 'CoverEyebrow'),
    p(book.title.trim(), 'Title'),
    p('ÖĞRENCİ ÇALIŞMA KİTABI  •  ' + (includeAnswers ? 'CEVAP ANAHTARLI' : 'ÖĞRENCİ NÜSHASI'), 'CoverDetail'),
    p('Kitap #' + book.id + '  |  A4  |  ' + (book.layoutColumns === 2 ? 'Çift sütun' : 'Tek sütun'), 'Subtitle'),
    coverSectionBreak()
  ];
  for (const chapter of ordered) {
    body.push(p(chapter.title, 'Heading1'));
    for (const item of [...chapter.questions].sort((a, b) => a.sortOrder - b.sortOrder)) {
      const question = item.snapshot;
      count++;
      const questionParts: string[] = [questionLabel(count), contentXml(question.content, drawings)];
      for (const frozenImage of question.privateGeometryAssets ?? []) {
        const image = images.find(item => item.sourceQuestionId === question.sourceQuestionId &&
          item.assetId === frozenImage.assetId);
        if (!image) throw new DocxExportError('Kitapta dondurulmuş özel geometri görseli bulunamadı.');
        questionParts.push(privatePngWordDrawing(image, drawings.nextId++));
      }
      if (question.questionType === 'MULTIPLE_CHOICE') {
        question.options.forEach((option, idx) => {
          questionParts.push(optionXml(option, idx, drawings));
        });
        answerRows.push(String(count) + '. ' + question.correctAnswer);
      } else if (question.questionType === 'TRUE_FALSE') {
        questionParts.push(p('□ Doğru       □ Yanlış'));
        answerRows.push(String(count) + '. ' + (question.booleanAnswer ? 'Doğru' : 'Yanlış'));
      } else {
        questionParts.push(p('Cevap: ________________________________________________________'));
        questionParts.push(p('________________________________________________________________'));
        answerRows.push(String(count) + '. ' + question.modelAnswer);
      }
      body.push(keepQuestionOnOnePage(questionParts, book.layoutColumns));
      // The next QuestionLabel style already supplies spacing in narrow columns.
      if (book.layoutColumns === 1) body.push(p(''));
    }
  }
  if (includeAnswers) {
    body.push(pageBreak(), p('Cevap Anahtarı', 'Heading1'));
    answerRows.forEach(answer => body.push(p(answer, 'AnswerEntry')));
  }
  body.push(p('PRO-LİG taslak Word çıktısı · Matbaa yayını değildir.', 'Footnote'));
  const sect = '<w:sectPr><w:headerReference w:type="default" r:id="rId2"/>' +
    '<w:footerReference w:type="default" r:id="rId3"/><w:pgSz w:w="11906" w:h="16838"/>' +
    '<w:pgMar w:top="1250" w:right="1200" w:bottom="1250" w:left="1200" w:header="500" w:footer="500" w:gutter="0"/>' +
    '<w:cols w:num="' + book.layoutColumns + '" w:space="420"/></w:sectPr>';
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    '<w:body>' + body.join('') + sect + '</w:body></w:document>';
}

const types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
  '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
  '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' +
  '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' +
  '</Types>';
const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
  '</Relationships>';
const docRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>' +
  '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>' +
  '</Relationships>';
const header = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
  '<w:p><w:pPr><w:jc w:val="right"/></w:pPr>' + run('PRO-LİG  |  YAYIN HAZIRLIK') + '</w:p></w:hdr>';
const footer = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
  '<w:p><w:pPr><w:jc w:val="center"/></w:pPr>' +
  run('PRO-LİG · Taslak belge  |  Sayfa ') +
  '<w:r><w:fldChar w:fldCharType="begin"/></w:r>' +
  '<w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>' +
  '<w:r><w:fldChar w:fldCharType="end"/></w:r>' +
  '</w:p></w:ftr>';
const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
  '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia" w:eastAsia="Georgia"/>' +
  '<w:sz w:val="21"/></w:rPr></w:rPrDefault></w:docDefaults>' +
  '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/>' +
  '<w:pPr><w:widowControl/><w:spacing w:after="105" w:line="300" w:lineRule="auto"/></w:pPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/>' +
  '<w:pPr><w:jc w:val="center"/><w:spacing w:before="600" w:after="360"/><w:keepNext/></w:pPr>' +
  '<w:rPr><w:b/><w:sz w:val="48"/><w:color w:val="6D2948"/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/>' +
  '<w:pPr><w:jc w:val="center"/></w:pPr><w:rPr><w:sz w:val="22"/><w:color w:val="886777"/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/>' +
  '<w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="245" w:after="145"/></w:pPr><w:rPr><w:b/><w:color w:val="6D2948"/><w:sz w:val="30"/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/>' +
  '<w:pPr><w:keepNext/><w:spacing w:before="160" w:after="90"/></w:pPr><w:rPr><w:b/><w:sz w:val="23"/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="CoverEyebrow"><w:name w:val="Cover Eyebrow"/>' +
  '<w:pPr><w:jc w:val="center"/><w:spacing w:before="1060" w:after="315"/><w:keepNext/></w:pPr>' +
  '<w:rPr><w:b/><w:color w:val="6D2948"/><w:sz w:val="30"/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="CoverDetail"><w:name w:val="Cover Detail"/>' +
  '<w:pPr><w:jc w:val="center"/><w:spacing w:before="250" w:after="400"/></w:pPr>' +
  '<w:rPr><w:color w:val="886777"/><w:sz w:val="20"/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="QuestionLabel"><w:name w:val="Question Label"/>' +
  '<w:pPr><w:keepNext/><w:spacing w:before="180" w:after="70"/></w:pPr><w:rPr><w:b/><w:color w:val="6D2948"/><w:sz w:val="23"/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="QuestionOption"><w:name w:val="Question Option"/>' +
  '<w:pPr><w:widowControl/><w:spacing w:before="0" w:after="80" w:line="290" w:lineRule="auto"/></w:pPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="AnswerEntry"><w:name w:val="Answer Entry"/>' +
  '<w:pPr><w:widowControl/><w:spacing w:before="0" w:after="100"/></w:pPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/></w:style>' +
  '<w:style w:type="paragraph" w:styleId="TableHead"><w:name w:val="TableHead"/><w:rPr><w:b/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Footnote"><w:name w:val="Footnote"/><w:rPr><w:color w:val="888888"/><w:sz w:val="16"/></w:rPr></w:style>' +
  '</w:styles>';

// ZIP STORE method is universally supported by Word and requires no external
// dependencies. Fixed metadata ensures a predictable, testable artifact.
function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function packageZip(files: Array<[string, string | Buffer]>): Buffer {
  const locals: Buffer[] = [], centrals: Buffer[] = [];
  let offset = 0;
  for (const [path, text] of files) {
    const filename = Buffer.from(path, 'utf8');
    const data = Buffer.isBuffer(text) ? text : Buffer.from(text, 'utf8');
    const checksum = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(0, 8); // STORE
    local.writeUInt16LE(0x21, 12); // 1980-01-01 (DOS ZIP date)
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(filename.length, 26);
    locals.push(local, filename, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0x21, 14); // 1980-01-01
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(filename.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, filename);
    offset += local.length + filename.length + data.length;
  }
  const directory = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(directory.length, 12);
  eocd.writeUInt32LE(offset, 16);
  const output = Buffer.concat([...locals, directory, eocd]);
  if (output.length > 8 * 1024 * 1024) throw new DocxExportError('Word çıktısı 8 MB sınırını aşıyor.');
  return output;
}

export function exportBookDocx(value: unknown, includeAnswers: boolean): Buffer {
  return exportBookDocxWithVerifiedPrivateGeometry(value, includeAnswers, []);
}

/**
 * Only verified server-fetched bytes may be embedded. Every byte payload must
 * match an immutable frozen reference in its BookQuestion snapshot.
 * Existing exportBookDocx remains backward-compatible and fails closed
 * if private media was frozen but the caller did not provide its bytes.
 */
export function exportBookDocxWithVerifiedPrivateGeometry(
  value: unknown,
  includeAnswers: boolean,
  supplied: ReadonlyArray<TrustedDocxPrivatePng>
): Buffer {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new DocxExportError('Kitap kaydı geçersiz.');
  }
  const book = value as DocxBook;
  validate(book);
  let images: PreparedPrivateDocxPng[];
  try {
    images = prepareTrustedDocxPngs(supplied);
  } catch {
    throw new DocxExportError('Özel geometri görselleri Word aktarımı için doğrulanamadı.');
  }
  const references = book.chapters.flatMap(c => c.questions.flatMap(q =>
    (q.snapshot.privateGeometryAssets ?? []).map(ref => ({
      sourceQuestionId: q.snapshot.sourceQuestionId, ...ref
    }))
  ));
  if (references.length !== images.length ||
      references.some(ref => !images.some(image =>
        image.sourceQuestionId === ref.sourceQuestionId &&
        image.assetId === ref.assetId && image.sha256 === ref.sha256 &&
        image.width === ref.width && image.height === ref.height &&
        ref.placement === 'STEM'
      ))) {
    throw new DocxExportError('Kitap anlık görüntüsündeki özel çizimler ile dosyalar eşleşmiyor.');
  }

  const relations = images.length
    ? docRels.replace('</Relationships>', privatePngRelationshipEntries(images) + '</Relationships>')
    : docRels;
  const contents = images.length
    ? types.replace('</Types>', '<Default Extension="png" ContentType="image/png"/></Types>')
    : types;
  return packageZip([
    ['[Content_Types].xml', contents],
    ['_rels/.rels', rels],
    ['word/document.xml', buildDocument(book, includeAnswers, images)],
    ['word/_rels/document.xml.rels', relations],
    ['word/styles.xml', styles],
    ['word/header1.xml', header],
    ['word/footer1.xml', footer],
    ...images.map(image => [image.filename, image.bytes] as [string, Buffer])
  ]);
}
