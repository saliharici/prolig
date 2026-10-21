import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { htmlToLegacyMarkup, legacyMarkupToHtml } from '../src/questions/question-editor-converter';

describe('P3-K safe text-table composer', () => {
  const source = readFileSync('src/questions/QuestionStemWysiwygEditor.tsx', 'utf8');
  it('offers bounded, editable cells without a new server contract', () => {
    expect(source).toContain('tableRows.length >= 8');
    expect(source).toContain('tableRows[0].length >= 5');
    expect(source).toContain('maxLength={80}');
    expect(source).toContain("type: 'paragraph'");
  });
  it('preserves pipe-separated table text through the legacy converter', () => {
    const row = '| Başlık 1 | Başlık 2 |';
    expect(htmlToLegacyMarkup(legacyMarkupToHtml(row))).toBe(row);
  });
});
