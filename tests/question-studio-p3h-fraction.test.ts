import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { htmlToLegacyMarkup, legacyMarkupToHtml } from '../src/questions/question-editor-converter';

describe('P3-H visual fraction builder', () => {
  const source = readFileSync('src/questions/QuestionStemWysiwygEditor.tsx', 'utf8');
  it('provides editable numerator, denominator, and a preview', () => {
    expect(source).toContain('p3-fraction-numerator');
    expect(source).toContain('p3-fraction-denominator');
    expect(source).toContain('question-p3-fraction-live');
    expect(source).toContain('disabled={disabled || !fractionNumerator.trim()');
  });
  it('preserves the generated fraction using the existing markup converter', () => {
    const formula = '$\\frac{2}{3}$';
    expect(htmlToLegacyMarkup(legacyMarkupToHtml(formula))).toBe(formula);
  });
});
