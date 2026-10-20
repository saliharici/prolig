import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
describe('P3-J selected equation revision', () => {
 const source = readFileSync('src/questions/QuestionStemWysiwygEditor.tsx','utf8');
 it('requires a bounded selected TeX expression before replacing', () => {
  expect(source).toContain("selected.startsWith('$')");
  expect(source).toContain("selected.endsWith('$')");
  expect(source).toContain("setEquationEditRange({ from, to })");
  expect(source).toContain("insertContentAt(equationEditRange, markup)");
 });
});
