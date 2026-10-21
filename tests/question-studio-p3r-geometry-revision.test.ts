import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { geometryMarker } from '../src/questions/geometry-markup';
import { parseSelectedGeometry, canReplaceSelectedGeometry } from '../src/questions/geometry-revision';

describe('P3-R edit saved geometry without changing other content', () => {
  const original = geometryMarker('triangle');

  it('requires an exact whole, known versioned marker', () => {
    expect(parseSelectedGeometry(original)).toBe('triangle');
    expect(parseSelectedGeometry(geometryMarker('circle'))).toBe('circle');
    expect(parseSelectedGeometry(geometryMarker('square'))).toBe('square');
    expect(parseSelectedGeometry(original.slice(1))).toBeNull();
    expect(parseSelectedGeometry(original + 'abc')).toBeNull();
    expect(parseSelectedGeometry('[[prolig-geometry:v2:triangle]]')).toBeNull();
    expect(parseSelectedGeometry('<script>')).toBeNull();
  });

  it('rejects stale edits after document changes even at identical offsets', () => {
    const text = 'X' + original + 'Y';
    const doc = { textBetween: (from: number, to: number) => text.slice(from, to) };
    const selection = { from: 1, to: 1 + original.length, original, document: doc };
    expect(canReplaceSelectedGeometry(selection, doc)).toBe(true);
    expect(canReplaceSelectedGeometry(selection, {
      textBetween: () => original
    })).toBe(false);
    expect(canReplaceSelectedGeometry({ ...selection, original: '[invalid]' }, doc)).toBe(false);
    expect(canReplaceSelectedGeometry({ ...selection, to: 4 }, doc)).toBe(false);
    expect(canReplaceSelectedGeometry(null, doc)).toBe(false);
  });

  it('exposes explicit edit controls without changing server storage', () => {
    const source = readFileSync('src/questions/QuestionStemWysiwygEditor.tsx', 'utf8');
    expect(source).toContain('Seçili kayıtlı şekli yükle');
    expect(source).toContain('Seçili şekli güncelle');
    expect(source).toContain('canReplaceSelectedGeometry(geometrySelection, editor.state.doc)');
    expect(source).toContain('insertContentAt(');
  });
});
