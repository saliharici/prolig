import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { htmlToLegacyMarkup, legacyMarkupToHtml } from '../src/questions/question-editor-converter';

describe('P3-I guided math builders', () => {
  const source = readFileSync('src/questions/QuestionStemWysiwygEditor.tsx', 'utf8');
  it('provides root, power, subscript inputs and a read-only math preview', () => {
    expect(source).toContain("setMathBuilderType(kind)");
    expect(source).toContain("mathBuilderType === 'root'");
    expect(source).toContain('question-p3-math-builder-preview');
    expect(source).toContain("mathBuilderType === 'power'");
    expect(source).toContain("mathBuilderType !== 'root' && !mathBase.trim()");
  });
  it('preserves TeX representation across legacy conversion', () => {
    for (const formula of ['$\\sqrt{x+1}$', '$x^{2}$', '$x_{1}$']) {
      expect(htmlToLegacyMarkup(legacyMarkupToHtml(formula))).toBe(formula);
    }
  });
});
