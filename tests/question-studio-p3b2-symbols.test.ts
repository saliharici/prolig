import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('P3-B2 inline symbol palette', () => {
  const editor = readFileSync(join(process.cwd(), 'src/questions/QuestionStemWysiwygEditor.tsx'), 'utf8');
  it('inserts symbols at the editor selection rather than rewriting legacy markup', () => {
    expect(editor).toContain('editor.chain().focus().insertContent(symbol).run()');
    expect(editor).toContain('onMouseDown={event => event.preventDefault()}');
    expect(editor).toContain('Semboller metin olarak eklenir; denklem nesnesi değildir.');
  });
  it('has subject groups and remains disabled when editor is read only', () => {
    expect(editor).toContain('Matematik sembolleri');
    expect(editor).toContain('Fen sembolleri');
    expect(editor).toContain("variant !== 'option'");
    expect(editor).toContain('disabled={disabled}');
  });
});
