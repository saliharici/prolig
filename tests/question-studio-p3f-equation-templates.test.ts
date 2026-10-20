import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const editor = readFileSync('src/questions/QuestionStemWysiwygEditor.tsx', 'utf8');
describe('P3-F equation template entry', () => {
  it('offers guarded fraction, square root, superscript and subscript templates', () => {
    for (const name of ['Kesir', 'Karekök', 'Üs', 'Alt indis']) expect(editor).toContain(name);
    expect(editor).toContain("insertContent('$' + template + '$')");
    expect(editor).toContain('disabled={disabled}');
  });
  it('states text-only semantics and preserves existing editor conversion', () => {
    expect(editor).toContain('LaTeX metni olarak eklenir');
    expect(editor).toContain('htmlToLegacyMarkup(ed.getHTML())');
  });
});
