import { describe, expect, it } from 'vitest';
import { exportBookDocx, DocxExportError, type DocxBook } from '../api/v1/_lib/book-docx.js';
import type { FrozenBookQuestionV1 } from '../src/publishing/book-draft-contract.js';

function snapshot(id: number, type: FrozenBookQuestionV1['questionType'] = 'MULTIPLE_CHOICE'): FrozenBookQuestionV1 {
  return {
    schemaVersion: 1,
    sourceQuestionId: id,
    sourceQuestionUpdatedAt: '2026-10-19T17:00:00.000Z',
    content: id === 77 ? '4 + 5 işleminin **sonucu** kaçtır?' :
      id === 79 ? '2x + 3 = 11 denklemini çözünüz.' : 'İki çift sayının toplamı çift midir?',
    imageUrl: null, grade: '9. Sınıf', objectiveCode: null, difficulty: null,
    questionType: type,
    options: type === 'MULTIPLE_CHOICE' ? ['7', '8', '9', '10'] : [],
    correctAnswer: type === 'MULTIPLE_CHOICE' ? 'C' : null,
    booleanAnswer: type === 'TRUE_FALSE' ? false : null,
    modelAnswer: type === 'OPEN_ENDED' ? 'x = 4' : null,
    explanation: null, scoringRubric: null, evaluationCriteria: null,
    authorName: 'Örnek Yazar', assets: []
  };
}
function book(): DocxBook {
  return {
    id: 1, title: 'PRO-LİG V2 Test Kitabı', layoutColumns: 1,
    chapters: [{ title: 'Bölüm 1 · Sorular', sortOrder: 0,
      questions: [
        { sortOrder: 0, snapshot: snapshot(77) },
        { sortOrder: 1, snapshot: snapshot(79, 'OPEN_ENDED') },
        { sortOrder: 2, snapshot: snapshot(78, 'TRUE_FALSE') }
      ]
    }]
  };
}

function unzipStored(buffer: Buffer): Map<string, string> {
  const result = new Map<string, string>();
  let position = 0;
  while (position + 30 <= buffer.length && buffer.readUInt32LE(position) === 0x04034b50) {
    expect(buffer.readUInt16LE(position + 8)).toBe(0); // ZIP STORE
    const dataLength = buffer.readUInt32LE(position + 18);
    const nameLength = buffer.readUInt16LE(position + 26);
    const extraLength = buffer.readUInt16LE(position + 28);
    const path = buffer.subarray(position + 30, position + 30 + nameLength).toString('utf8');
    const start = position + 30 + nameLength + extraLength;
    result.set(path, buffer.subarray(start, start + dataLength).toString('utf8'));
    position = start + dataLength;
  }
  expect(buffer.readUInt32LE(position)).toBe(0x02014b50); // Central directory
  const eocd = buffer.subarray(buffer.length - 22);
  expect(eocd.readUInt32LE(0)).toBe(0x06054b50);
  expect(eocd.readUInt16LE(10)).toBe(result.size);
  return result;
}

describe('Publishing DOCX V1, editable real OOXML package', () => {
  it('creates the 7 required ZIP parts and preserves the frozen #77→#79→#78 order', () => {
    const packageBytes = exportBookDocx(book(), false);
    expect(packageBytes.subarray(0,4).toString('hex')).toBe('504b0304');
    const files = unzipStored(packageBytes);
    expect([...files.keys()].sort()).toEqual(
      ['[Content_Types].xml','_rels/.rels','word/_rels/document.xml.rels','word/document.xml','word/styles.xml','word/header1.xml','word/footer1.xml'].sort()
    );
    const xml = files.get('word/document.xml')!;
    expect(xml).toContain('PRO-LİG V2 Test Kitabı');
    expect(xml).toContain('<w:pgSz w:w="11906" w:h="16838"/>');
    const idxA = xml.indexOf('4 + 5 işleminin');
    const idxB = xml.indexOf('2x + 3 = 11');
    const idxC = xml.indexOf('İki çift sayının');
    expect(idxA).toBeGreaterThan(0);
    expect(idxB).toBeGreaterThan(idxA);
    expect(idxC).toBeGreaterThan(idxB);
    expect(xml).toContain('<w:b/>'); // Saved bold formatting preserved
    expect(xml).not.toContain('Cevap Anahtarı');
    expect(xml).not.toContain('x = 4'); // Model answer stays out of student copy
  });

  it('keeps styled option labels and text together in one Word paragraph', () => {
    const testBook = book();
    testBook.chapters[0].questions[0].snapshot.options = [
      '**Kalın** seçenek', '_İtalik_ seçenek', '<u>Altı çizili</u> seçenek', 'Düz seçenek'
    ];
    const xml = unzipStored(exportBookDocx(testBook, true)).get('word/document.xml')!;
    for (const [label, value] of [['A) ', 'Kalın'], ['B) ', 'İtalik'], ['C) ', 'Altı çizili'], ['D) ', 'Düz']]) {
      const prefix = '<w:t xml:space="preserve">' + label + '</w:t>';
      const start = xml.indexOf(prefix);
      expect(start).toBeGreaterThan(0);
      const end = xml.indexOf('</w:p>', start);
      expect(xml.slice(start, end)).toContain(value);
    }
    expect(xml).toContain('<w:b/>');
    expect(xml).toContain('<w:i/>');
    expect(xml).toContain('1. C');
    expect(xml.indexOf('1. C')).toBeLessThan(xml.indexOf('2. x = 4'));
    expect(xml.indexOf('2. x = 4')).toBeLessThan(xml.indexOf('3. Yanlış'));
  });

  it('keeps the answer key in the answer-key edition only', () => {
    const answerDocument = unzipStored(exportBookDocx(book(), true)).get('word/document.xml')!;
    const studentDocument = unzipStored(exportBookDocx(book(), false)).get('word/document.xml')!;
    expect(answerDocument).toContain('Cevap Anahtarı');
    expect(answerDocument).toContain('1. C');
    expect(answerDocument).toContain('2. x = 4');
    expect(answerDocument).toContain('3. Yanlış');
    expect(studentDocument).not.toContain('1. C');
    expect(studentDocument).not.toContain('3. Yanlış');
    expect(exportBookDocx(book(),true)).toEqual(exportBookDocx(book(),true));
  });

  it('escapes injected XML and preserves Turkish characters without executing markup', () => {
    const test = book();
    test.title = 'Örnek & Kitap <script>';
    test.chapters[0].questions[0].snapshot.content = 'Soru <script>alert(1)</script> & cevap';
    const xml = unzipStored(exportBookDocx(test, false)).get('word/document.xml')!;
    expect(xml).toContain('Örnek &amp; Kitap &lt;script&gt;');
    expect(xml).toContain('Soru &lt;script&gt;alert(1)&lt;/script&gt; &amp; cevap');
    expect(xml).not.toContain('<script>');
  });

  it('fails closed for media, unsupported math, two columns and malformed answers', () => {
    const withImage = book();
    withImage.chapters[0].questions[0].snapshot.imageUrl = '/a.png';
    expect(() => exportBookDocx(withImage,false)).toThrowError(DocxExportError);
    expect(() => exportBookDocx(withImage,false)).toThrow('Görsel');
    const withMath = book();
    withMath.chapters[0].questions[0].snapshot.content = 'Hesap $x^2$';
    const powerXml = unzipStored(exportBookDocx(withMath,false)).get('word/document.xml')!;
    expect(powerXml).toContain('<m:sSup>');
    const columns = book();
    columns.layoutColumns = 2;
    const twoColumnXml = unzipStored(exportBookDocx(columns, false)).get('word/document.xml')!;
    expect(twoColumnXml).toContain('<w:cols w:num="2" w:space="420"/>');
    expect(twoColumnXml).toContain('<w:type w:val="nextPage"/>');
    expect(twoColumnXml).toContain('<w:cols w:num="1"/></w:sectPr></w:pPr></w:p>');
    expect(twoColumnXml.indexOf('<w:cols w:num="1"/></w:sectPr>'))
      .toBeLessThan(twoColumnXml.indexOf('<w:cols w:num="2" w:space="420"/>'));

    columns.layoutColumns = 3;
    expect(() => exportBookDocx(columns, false)).toThrow('tek veya çift sütun');
    const malformed = book();
    malformed.chapters[0].questions[0].snapshot.correctAnswer = null;
    expect(() => exportBookDocx(malformed,false)).toThrow('cevap anahtarı');
  });
  it('adds professional Word typography and keeps question labels with their stems', () => {
    const files = unzipStored(exportBookDocx(book(), false));
    const xml = files.get('word/document.xml')!;
    const stylesXml = files.get('word/styles.xml')!;
    expect(stylesXml).toContain('w:styleId="QuestionLabel"');
    expect(stylesXml).toContain('w:styleId="CoverEyebrow"');
    expect(stylesXml).toContain('w:styleId="CoverDetail"');
    expect(xml).toContain('SORU KİTABI');
    expect(xml).toContain('ÖĞRENCİ NÜSHASI');
    expect(stylesXml).toContain('w:ascii="Aptos"');
    expect(stylesXml).toContain('w:keepNext');
    expect(stylesXml).toContain('w:lineRule="auto"');
    expect(xml).toContain('<w:pStyle w:val="QuestionLabel"/><w:keepNext/>');
    expect(xml).toContain('<w:headerReference w:type="default" r:id="rId2"/>');
    expect(xml).toContain('<w:footerReference w:type="default" r:id="rId3"/>');
    expect(files.get('word/header1.xml')).toContain('YAYIN HAZIRLIK');
    expect(files.get('word/footer1.xml')).toContain(' PAGE ');
    expect(files.get('word/_rels/document.xml.rels')).toContain('Target="footer1.xml"');
    expect(xml).toContain('1. Soru');
    expect(xml).toContain('2. Soru');
    expect(xml).toContain('3. Soru');
    expect(xml).not.toContain('Cevap Anahtarı');
  });

  it('produces editable OMML for safe inline algebra and rejects unsupported TeX', () => {
    const simple = book();
    simple.chapters[0].questions[0].snapshot.content = 'Çözünüz: $x + 2 = 5$';
    const xml = unzipStored(exportBookDocx(simple, false)).get('word/document.xml')!;
    expect(xml).toContain('<m:oMath><m:r><m:t xml:space="preserve">x + 2 = 5</m:t></m:r></m:oMath>');
    expect(xml).toContain('xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"');
    const unsupported = book();
    unsupported.chapters[0].questions[0].snapshot.content = 'Hesap $\\int_0^1
    expect(() => exportBookDocx(unsupported, false)).toThrow('Matematik ifadesinin Word denklem dizgisi');
  });

});
;
    expect(() => exportBookDocx(unsupported, false)).toThrow('Matematik ifadesinin Word denklem dizgisi');
  });

  it('serializes simple fractions, square roots and superscripts as editable OMML', () => {
    for (const [input, expected] of [
      ['$\\\\frac{1}{2}$', '<m:f>'],
      ['$\\\\sqrt{9}$', '<m:rad>'],
      ['$x^2$', '<m:sSup>']
    ]) {
      const fixture = book();
      fixture.chapters[0].questions[0].snapshot.content = 'Çözünüz: ' + input;
      const xml = unzipStored(exportBookDocx(fixture, false)).get('word/document.xml')!;
      expect(xml).toContain(expected);
    }
  });

});
