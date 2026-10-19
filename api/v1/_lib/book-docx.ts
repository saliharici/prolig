import { parseStudioBlocks, type StudioBlock, type StudioInline } from '../../../src/questions/studio-document.js';
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
function paragraphRuns(nodes: StudioInline[], style = ''): string {
  const text = nodes.map(node => {
    let flags = '';
    if (node.kind === 'bold') flags = '<w:b/>';
    if (node.kind === 'italic') flags = '<w:i/>';
    if (node.kind === 'underline') flags = '<w:u w:val="single"/>';
    return run(node.text, flags);
  }).join('');
  return '<w:p>' + (style ? '<w:pPr><w:pStyle w:val="' + style + '"/></w:pPr>' : '') +
    text + '</w:p>';
}
function cell(text: string, header = false): string {
  return '<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>' +
    p(text, header ? 'TableHead' : '') + '</w:tc>';
}
function blocksToXml(blocks: StudioBlock[]): string {
  return blocks.map(block => {
    if (block.kind === 'paragraph') return paragraphRuns(block.children);
    if (block.kind === 'list') return block.items.map((item, i) =>
      paragraphRuns([{ kind: 'text', text: (block.ordered ? String(i + 1) + '. ' : '• ') }, ...item], 'ListParagraph')).join('');
    const border = '<w:tblPr><w:tblBorders><w:bottom w:val="single" w:sz="4"/><w:top w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr>';
    const header = '<w:tr>' + block.columns.map(x => cell(x, true)).join('') + '</w:tr>';
    const rows = block.rows.map(row => '<w:tr>' + row.map(x => cell(x)).join('') + '</w:tr>').join('');
    const grid = '<w:tblGrid>' + block.columns.map(() => '<w:gridCol w:w="1800"/>').join('') + '</w:tblGrid>';
    return '<w:tbl>' + border + grid + header + rows + '</w:tbl>';
  }).join('');
}
function contentXml(value: string): string {
  return blocksToXml(parseStudioBlocks(value));
}
function optionXml(value: string, index: number): string {
  const label = String.fromCharCode(65 + index) + ') ';
  const blocks = parseStudioBlocks(value);
  // Keep the option label in the same editable paragraph as its first text run.
  if (blocks[0]?.kind === 'paragraph') {
    const [first, ...rest] = blocks;
    return paragraphRuns([{ kind: 'text', text: label }, ...first.children]) + blocksToXml(rest);
  }
  // Tables cannot share a paragraph with text; retain the label before the table.
  return p(label) + blocksToXml(blocks);
}
function pageBreak(): string { return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'; }

function validate(book: DocxBook): void {
  if (!Number.isSafeInteger(book.id) || book.id < 1 || typeof book.title !== 'string' ||
      !book.title.trim() || book.title.length > 120)
    throw new DocxExportError('Kitap başlığı veya kimliği geçersiz.');
  if (book.layoutColumns !== 1)
    throw new DocxExportError('İlk Word sürümünde yalnız tek sütun desteklenir. Kitap düzenini tek sütuna getirip kaydedin.');
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
    for (const value of [q.content, ...q.options, q.explanation ?? '', q.modelAnswer ?? '']) {
      // Math expressions must not silently become source TeX in a publishing document.
      if (/\$[^$\n]+\$|\\frac\b|\\sqrt\b|\\\(|\\\[/.test(value))
        throw new DocxExportError('Matematik dizgisi içeren soru için Word dönüştürme henüz desteklenmiyor.');
      if (parseStudioBlocks(value).some(b => b.kind === 'paragraph' && b.children.some(n => n.kind === 'math' || n.kind === 'link')))
        throw new DocxExportError('Matematik veya bağlantı içeren soru için Word dönüştürme henüz desteklenmiyor.');
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

function buildDocument(book: DocxBook, includeAnswers: boolean): string {
  const ordered = [...book.chapters].sort((a, b) => a.sortOrder - b.sortOrder);
  let count = 0;
  const answerRows: string[] = [];
  const body: string[] = [
    p('PRO-LİG · YAYIN HAZIRLIK ÖNİZLEMESİ', 'Subtitle'),
    p(book.title.trim(), 'Title'),
    p('Kitap #' + book.id + ' · Word taslak çıktısı', 'Subtitle'),
    pageBreak()
  ];
  for (const chapter of ordered) {
    body.push(p(chapter.title, 'Heading1'));
    for (const item of [...chapter.questions].sort((a, b) => a.sortOrder - b.sortOrder)) {
      const question = item.snapshot;
      count++;
      body.push(p(String(count) + '. Soru', 'Heading2'));
      body.push(contentXml(question.content));
      if (question.questionType === 'MULTIPLE_CHOICE') {
        question.options.forEach((option, idx) => {
          body.push(optionXml(option, idx));
        });
        answerRows.push(String(count) + '. ' + question.correctAnswer);
      } else if (question.questionType === 'TRUE_FALSE') {
        body.push(p('□ Doğru       □ Yanlış'));
        answerRows.push(String(count) + '. ' + (question.booleanAnswer ? 'Doğru' : 'Yanlış'));
      } else {
        body.push(p('Cevap: ________________________________________________________'));
        body.push(p('________________________________________________________________'));
        answerRows.push(String(count) + '. ' + question.modelAnswer);
      }
      body.push(p(''));
    }
  }
  if (includeAnswers) {
    body.push(pageBreak(), p('Cevap Anahtarı', 'Heading1'));
    answerRows.forEach(answer => body.push(p(answer)));
  }
  body.push(p('PRO-LİG taslak Word çıktısı · Matbaa yayını değildir.', 'Footnote'));
  const sect = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
    '<w:pgMar w:top="1250" w:right="1200" w:bottom="1250" w:left="1200" w:header="500" w:footer="500" w:gutter="0"/>' +
    '<w:cols w:num="1"/></w:sectPr>';
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:body>' + body.join('') + sect + '</w:body></w:document>';
}

const types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
  '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
  '</Types>';
const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
  '</Relationships>';
const docRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  '</Relationships>';
const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
  '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri"/>' +
  '<w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>' +
  '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/>' +
  '<w:pPr><w:spacing w:after="140"/></w:pPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/>' +
  '<w:pPr><w:jc w:val="center"/><w:spacing w:after="300"/></w:pPr>' +
  '<w:rPr><w:b/><w:sz w:val="48"/><w:color w:val="6D2948"/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/>' +
  '<w:pPr><w:jc w:val="center"/></w:pPr><w:rPr><w:sz w:val="22"/><w:color w:val="886777"/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/>' +
  '<w:pPr><w:keepNext/><w:spacing w:before="300" w:after="180"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/>' +
  '<w:pPr><w:keepNext/><w:spacing w:before="160" w:after="90"/></w:pPr><w:rPr><w:b/><w:sz w:val="23"/></w:rPr></w:style>' +
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
function packageZip(files: Array<[string, string]>): Buffer {
  const locals: Buffer[] = [], centrals: Buffer[] = [];
  let offset = 0;
  for (const [path, text] of files) {
    const filename = Buffer.from(path, 'utf8');
    const data = Buffer.from(text, 'utf8');
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
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new DocxExportError('Kitap kaydı geçersiz.');
  }
  // Prisma JsonValue is intentionally validated at the DOCX boundary.
  const book = value as DocxBook;
  validate(book);
  return packageZip([
    ['[Content_Types].xml', types],
    ['_rels/.rels', rels],
    ['word/document.xml', buildDocument(book, includeAnswers)],
    ['word/_rels/document.xml.rels', docRels],
    ['word/styles.xml', styles]
  ]);
}
