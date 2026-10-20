import { describe, expect, it } from 'vitest';
import { geometryMarker, splitGeometryMarkup, containsGeometryMarkup } from '../src/questions/geometry-markup';
import { htmlToLegacyMarkup, legacyMarkupToHtml } from '../src/questions/question-editor-converter';
import { parseStudioBlocks } from '../src/questions/studio-document';
import { exportBookDocx, DocxExportError } from '../api/v1/_lib/book-docx';
import type { FrozenBookQuestionV1 } from '../src/publishing/book-draft-contract';

describe('P3-Q persistent geometry without a database migration', () => {
  it('roundtrips all canonical markers through WYSIWYG legacy conversion and preview parser', () => {
    for (const shape of ['triangle', 'circle', 'square'] as const) {
      const markup = geometryMarker(shape);
      const value = 'Şekli inceleyin: ' + markup;
      expect(htmlToLegacyMarkup(legacyMarkupToHtml(value))).toBe(value);
      const blocks = parseStudioBlocks(value);
      expect(blocks[0]?.kind).toBe('paragraph');
      expect(splitGeometryMarkup(value)).toEqual([
        { kind: 'text', value: 'Şekli inceleyin: ' },
        { kind: 'geometry', shape }
      ]);
    }
  });
  it('leaves unknown versions and user text inert', () => {
    const source = 'Örnek [[prolig-geometry:v9:triangle]] <script> x';
    expect(splitGeometryMarkup(source)).toEqual([{ kind: 'text', value: source }]);
    expect(containsGeometryMarkup(source)).toBe(true);
    expect(() => geometryMarker('script' as never)).toThrow();
  });
  it('refuses Word output rather than leaking a hidden geometry marker', () => {
    const question: FrozenBookQuestionV1 = {
      schemaVersion: 1, sourceQuestionId: 1, sourceQuestionUpdatedAt: '2026-10-21T00:00:00Z',
      content: 'ABC: ' + geometryMarker('triangle'), imageUrl: null, grade: '8',
      objectiveCode: null, difficulty: null, questionType: 'MULTIPLE_CHOICE',
      options: ['A','B','C','D'], correctAnswer: 'A', booleanAnswer: null,
      modelAnswer: null, explanation: null, scoringRubric: null,
      evaluationCriteria: null, authorName: null, assets: []
    };
    expect(() => exportBookDocx({
      id: 1, title: 'Geometri deneme kitabı', layoutColumns: 1,
      chapters: [{ title: 'Geometri', sortOrder: 0, questions: [{ sortOrder: 0, snapshot: question }] }]
    }, false)).toThrow(DocxExportError);
  });
});
