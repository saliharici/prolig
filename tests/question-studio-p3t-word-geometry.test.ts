import { describe, expect, it } from 'vitest';
import { geometryMarker } from '../src/questions/geometry-markup';
import { knownGeometryOnly, wordGeometryDrawing } from '../api/v1/_lib/docx-geometry';
import { exportBookDocx, DocxExportError } from '../api/v1/_lib/book-docx';
import type { FrozenBookQuestionV1 } from '../src/publishing/book-draft-contract';

const sampleQuestion = (content: string): FrozenBookQuestionV1 => ({
  schemaVersion: 1, sourceQuestionId: 1, sourceQuestionUpdatedAt: '2026-10-21T00:00:00Z',
  content, imageUrl: null, grade: '8', objectiveCode: null, difficulty: null,
  questionType: 'MULTIPLE_CHOICE', options: ['Bir', 'İki', 'Üç', 'Dört'],
  correctAnswer: 'A', booleanAnswer: null, modelAnswer: null, explanation: null,
  scoringRubric: null, evaluationCriteria: null, authorName: null, assets: []
});
const book = (content: string) => ({
  id: 17, title: 'Matematik Geometri Kitabı', layoutColumns: 1 as const,
  chapters: [{ title: 'Çokgenler', sortOrder: 0,
    questions: [{ sortOrder: 0, snapshot: sampleQuestion(content) }] }]
});

describe('P3-T editable Word-native geometric drawings', () => {
  it('exports all three trusted shapes using Office WordprocessingShape OOXML', () => {
    const content = ['triangle', 'circle', 'square'].map(x => geometryMarker(x as 'triangle' | 'circle' | 'square')).join(' ve ');
    const docx = exportBookDocx(book('Şekilleri inceleyin: ' + content), false);
    const buffer = docx.toString('utf8'); // ZIP STORE payload keeps document.xml uncompressed.
    expect(buffer).toContain('word/document.xml');
    expect(buffer).toContain('xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"');
    expect(buffer).toContain('<a:prstGeom prst="triangle">');
    expect(buffer).toContain('<a:prstGeom prst="ellipse">');
    expect(buffer).toContain('<a:prstGeom prst="rect">');
    expect(buffer).toContain('ABC üçgeni');
    expect(buffer).toContain('O merkezli çember');
    expect(buffer).toContain('ABCD karesi');
    expect(buffer).toContain('<wp:docPr id="1"');
    expect(buffer).toContain('<wp:docPr id="2"');
    expect(buffer).toContain('<wp:docPr id="3"');
    expect(buffer).not.toContain('[[prolig-geometry:v1:');
  });

  it('preserves ordinary text and text formatting around native drawings', () => {
    const docx = exportBookDocx(book('**Soru** ' + geometryMarker('triangle') + ' _cevap_'), false).toString('utf8');
    expect(docx).toContain('<w:b/>');
    expect(docx).toContain('<w:i/>');
    expect(docx).toContain('Soru');
    expect(docx).toContain('cevap');
  });

  it('rejects unknown or future geometry instead of dropping diagrams', () => {
    expect(knownGeometryOnly('abc ' + geometryMarker('circle'))).toBe(true);
    expect(knownGeometryOnly('[[prolig-geometry:v9:circle]]')).toBe(false);
    expect(() => exportBookDocx(book('Şekil [[prolig-geometry:v9:triangle]]'), false)).toThrow(DocxExportError);
    expect(() => exportBookDocx(book('| A | B |\n| --- | --- |\n| ' + geometryMarker('square') + ' | X |'), false)).toThrow(DocxExportError);
    expect(() => exportBookDocx(book('Şekil $' + geometryMarker('triangle') + '$'), false)).toThrow(DocxExportError);
    expect(() => wordGeometryDrawing('octagon' as never, 1)).toThrow();
  });

  it('rejects drawings with nonpositive identifiers', () => {
    expect(() => wordGeometryDrawing('triangle', 0)).toThrow();
  });
});
