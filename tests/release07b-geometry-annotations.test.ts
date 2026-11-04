import { describe, it, expect } from 'vitest';
import { defaultGeometry, defaultGeometryLabels, validGeometry, withGeometryLabel,
  readGeometryMarker, editableGeometryMarker } from '../src/questions/geometry-parameters';
import { geometryMarker, splitGeometryMarkup } from '../src/questions/geometry-markup';
import { geometrySvg } from '../src/questions/geometry-svg';
import { layoutGeometryLabels } from '../src/questions/geometry-label-layout';
import { wordGeometryDrawing, knownGeometryOnly } from '../api/v1/_lib/docx-geometry';
import { htmlToLegacyMarkup, legacyMarkupToHtml } from '../src/questions/question-editor-converter';
import { exportBookDocx } from '../api/v1/_lib/book-docx';

const base = () => ({ ...defaultGeometry('triangle'), labels: defaultGeometryLabels('triangle') });
describe('RELEASE-07B: cohesive editor/Word geometry labels', () => {
  it('keeps legacy v1/v2 exact and adds bounded v3 round-trip', () => {
    for (const shape of ['triangle', 'square', 'circle'] as const) {
      const v1 = geometryMarker(shape);
      const v2 = editableGeometryMarker(defaultGeometry(shape));
      expect(readGeometryMarker(v1)).toEqual(defaultGeometry(shape));
      expect(readGeometryMarker(v2)).toEqual(defaultGeometry(shape));
      const decorated = { ...defaultGeometry(shape), labels: defaultGeometryLabels(shape) };
      const v3 = editableGeometryMarker(decorated);
      expect(v3).toContain('[[prolig-geometry:v3:');
      expect(readGeometryMarker(v3)).toEqual(decorated);
      expect(splitGeometryMarkup('Önce ' + v3 + ' sonra'))
        .toEqual([{ kind: 'text', value: 'Önce ' },
          { kind: 'geometry', shape, values: decorated.values, labels: decorated.labels },
          { kind: 'text', value: ' sonra' }]);
      expect(htmlToLegacyMarkup(legacyMarkupToHtml('Önce ' + v3 + ' sonra'))).toBe('Önce ' + v3 + ' sonra');
      expect(knownGeometryOnly(v3)).toBe(true);
    }
  });
  it('rejects impossible labels, duplicates, control characters and forged metadata', () => {
    expect(validGeometry({ ...base(), labels: { points: ['A', 'A', 'C'], sides: ['', '', ''], angles: ['', '', ''] } })).toBe(false);
    expect(withGeometryLabel(base(), 'sides', 0, '<script>')).toEqual(base());
    expect(withGeometryLabel(base(), 'points', 0, 'aa')).toEqual(base());
    expect(readGeometryMarker('[[prolig-geometry:v3:triangle:90,12,24,110,156,110:AAAA]]')).toBeNull();
    expect(knownGeometryOnly('[[prolig-geometry:v3:triangle:90,12,24,110,156,110:AAAA]]')).toBe(false);
  });
  it('renders vertex, side and angle annotations into browser/SVG and Word vector', () => {
    let g: ReturnType<typeof withGeometryLabel> = base();
    g = withGeometryLabel(g, 'points', 0, 'P');
    g = withGeometryLabel(g, 'sides', 0, '5 cm');
    g = withGeometryLabel(g, 'angles', 0, '30°');
    expect(layoutGeometryLabels(g).map(l => l.value)).toContain('30°');
    const svg = geometrySvg('triangle', g);
    expect(svg).toContain('>P</text>');
    expect(svg).toContain('>5 cm</text>');
    expect(svg).toContain('>30°</text>');
    const xml = wordGeometryDrawing('triangle', 1, g.values, g.labels);
    expect(xml).toContain('descr="Üçgen; P B C 5 cm 30°"');
    expect(xml).toContain('<a:custGeom>');
    expect((xml.match(/<a:path /g) || []).length).toBeGreaterThan(2);
    expect(xml).not.toContain('<a:prstGeom');
  });
  it('exports separate geometry paragraphs without redundant (ABC üçgeni) caption', () => {
    const g = withGeometryLabel(base(), 'sides', 1, '8 cm');
    const marker = editableGeometryMarker(g);
    const snapshot: any = {
      schemaVersion: 1, sourceQuestionId: 1, sourceQuestionUpdatedAt: '2026-11-01T00:00:00Z',
      content: 'Soru başlangıcı ' + marker + ' Soru devamı', imageUrl: null, grade: '8',
      objectiveCode: null, difficulty: null, questionType: 'MULTIPLE_CHOICE',
      options: ['1', '2', '3', '4'], correctAnswer: 'A', booleanAnswer: null,
      modelAnswer: null, explanation: null, scoringRubric: null,
      evaluationCriteria: null, assets: []
    };
    const xml = exportBookDocx({ id: 1, title: 'Gelişmiş geometri', layoutColumns: 1,
      chapters: [{ title: 'Geometri', sortOrder: 0, questions: [{ sortOrder: 0, snapshot }] }] }, false).toString('utf8');
    expect(xml).toContain('<a:custGeom>');
    expect(xml).not.toContain(marker);
    expect(xml).not.toContain('(ABC üçgeni)');
    expect(xml).toContain('Soru başlangıcı');
    expect(xml).toContain('Soru devamı');
    expect(xml).toMatch(/<w:p>[^]*?<w:drawing>[^]*?<\/w:drawing><\/w:r><\/w:p>/);
  });
});
