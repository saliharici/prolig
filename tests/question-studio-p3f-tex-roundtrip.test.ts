import { describe, expect, it } from 'vitest';
import { htmlToLegacyMarkup, legacyMarkupToHtml } from '../src/questions/question-editor-converter';

describe('P3-F equation template roundtrip', () => {
  const formulas = ["$\\frac{a}{b}$","$\\sqrt{x}$","$x^{2}$","$x_{1}$"];
  for (const formula of formulas) {
    it('retains exact TeX content after save and reopen conversion: ' + formula, () => {
      const html = legacyMarkupToHtml(formula);
      expect(html).toContain('<code>');
      expect(htmlToLegacyMarkup(html)).toBe(formula);
    });
  }
});