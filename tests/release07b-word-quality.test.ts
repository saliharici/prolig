import { describe, expect, it } from 'vitest';
import { parseStudioBlocks } from '../src/questions/studio-document';
import { defaultGeometry, defaultGeometryLabels, withGeometryLabel, type GeometryDrawing } from '../src/questions/geometry-parameters';
import { geometryConsistencyWarnings } from '../src/questions/geometry-consistency';
import { layoutGeometryLabels } from '../src/questions/geometry-label-layout';
import { wordGeometryDrawing } from '../api/v1/_lib/docx-geometry';
import { exportBookDocx } from '../api/v1/_lib/book-docx';

const sample = `Soru metni\n\n| Başlık 1 | Başlık 2 |\n\n| --- | --- |\n\n| ss | ss |\n\n| aa | aa |`;
const sourceQuestion = (content: string): any => ({
  schemaVersion: 1, sourceQuestionId: 1, sourceQuestionUpdatedAt: '2026-11-02T00:00:00Z',
  content, imageUrl: null, grade: '8', objectiveCode: null, difficulty: null,
  questionType: 'MULTIPLE_CHOICE', options: ['aa', 'ss', 'dd', 'ff'], correctAnswer: 'A',
  booleanAnswer: null, modelAnswer: null, explanation: null, scoringRubric: null,
  evaluationCriteria: null, assets: []
});

describe('RELEASE-07B Word V6 quality fixes', () => {
  it('recognizes markdown tables separated by editor blank paragraphs', () => {
    const blocks = parseStudioBlocks(sample);
    expect(blocks).toHaveLength(2);
    expect(blocks[1]).toEqual({ kind: 'table', columns: ['Başlık 1', 'Başlık 2'], rows: [['ss', 'ss'], ['aa', 'aa']] });
  });
  it('does not turn ordinary pipe text into a Word table', () => {
    const blocks = parseStudioBlocks('A | B\n\nNot a separator');
    expect(blocks.every(block => block.kind !== 'table')).toBe(true);
  });
  it('generates a real editable DOCX table from the sample', () => {
    const out = exportBookDocx({ id: 1, title: 'Tablo denemesi', layoutColumns: 1,
      chapters: [{ title: 'Deneme', sortOrder: 0, questions: [{ sortOrder: 0, snapshot: sourceQuestion(sample) }] }] }, false);
    const xml = out.toString('utf8');
    expect(xml).toContain('<w:tbl>');
    expect(xml).toContain('<w:tr>');
    expect(xml).toContain('Başlık 1');
  });
  it('displays a numeric angle with ° but leaves the saved value unchanged', () => {
    const drawing = withGeometryLabel({ ...defaultGeometry('triangle'), labels: defaultGeometryLabels('triangle') }, 'angles', 0, '30');
    expect(drawing.labels?.angles[0]).toBe('30');
    expect(layoutGeometryLabels(drawing).some(label => label.kind === 'angle' && label.value === '30°')).toBe(true);
    expect(wordGeometryDrawing('triangle', 1, drawing.values, drawing.labels)).toContain('30°');
  });
  it('warns for inconsistent triangle measurements but does not block editing', () => {
    let g: GeometryDrawing = { ...defaultGeometry('triangle'), labels: defaultGeometryLabels('triangle') };
    for (const [i, v] of ['5', '6', '8'].entries()) g = withGeometryLabel(g, 'sides', i, v);
    for (const [i, v] of ['30', '60', '90'].entries()) g = withGeometryLabel(g, 'angles', i, v);
    expect(geometryConsistencyWarnings(g)).toEqual(expect.arrayContaining([expect.stringContaining('sinüs teoremi')]));
  });
  it('preserves the editor values and remains advisory for partial measurements', () => {
    const g = withGeometryLabel({ ...defaultGeometry('triangle'), labels: defaultGeometryLabels('triangle') }, 'sides', 0, '5 cm');
    expect(geometryConsistencyWarnings(g)).toEqual([]);
    expect(g.labels?.sides[0]).toBe('5 cm');
  });
});
