import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { htmlToLegacyMarkup, legacyMarkupToHtml } from '../src/questions/question-editor-converter';

describe('P3-L symbolic geometry', () => {
  const source = readFileSync('src/questions/QuestionStemWysiwygEditor.tsx', 'utf8');
  it('distinguishes text-only symbols from the later persistent-shape option', () => {
    expect(source).toContain('Sembolik gösterim ekleme yalnızca karakter yazar');
    expect(source).toContain('editableGeometryMarker(drawing)');
    expect(source).toContain("shapeType === 'triangle' ? '△ABC'");
    expect(source).toContain('<DraggableGeometry');
  });
  it('preserves symbolic geometry across legacy conversion', () => {
    for (const value of ['△ABC', '◯O', '□ABCD']) {
      expect(htmlToLegacyMarkup(legacyMarkupToHtml(value))).toBe(value);
    }
  });
});
