import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { htmlToLegacyMarkup, legacyMarkupToHtml } from '../src/questions/question-editor-converter';

describe('P3-L symbolic geometry', () => {
  const source = readFileSync('src/questions/QuestionStemWysiwygEditor.tsx', 'utf8');
  it('labels the preview as non-persistent and only inserts text', () => {
    expect(source).toContain('SVG önizleme soru kaydına veya Word belgesine aktarılmaz.');
    expect(source).toContain("shapeType === 'triangle' ? '△ABC'");
    expect(source).toContain('p3-shape-preview');
  });
  it('preserves symbolic geometry across legacy conversion', () => {
    for (const value of ['△ABC', '◯O', '□ABCD']) {
      expect(htmlToLegacyMarkup(legacyMarkupToHtml(value))).toBe(value);
    }
  });
});
