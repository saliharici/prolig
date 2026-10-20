import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Schema } from '@tiptap/pm/model';
import { geometryMarker } from '../src/questions/geometry-markup';
import { canReplaceSelectedGeometry, listEditableGeometry } from '../src/questions/geometry-revision';

const schema = new Schema({
  nodes: {
    doc: { content: 'paragraph+' },
    paragraph: { group: 'block', content: 'text*' },
    text: {}
  },
  marks: {
    strong: {}
  }
});

const p = (text: string) => schema.nodes.paragraph.create(null, schema.text(text));

describe('P3-S saved shape selection by document position', () => {
  it('finds multiple shapes in document order with correct ProseMirror offsets', () => {
    const triangle = geometryMarker('triangle');
    const square = geometryMarker('square');
    const doc = schema.nodes.doc.create(null, [p('Başlangıç ' + triangle + ' bitiş'), p('İkinci ' + square)]);
    const items = listEditableGeometry(doc);
    expect(items).toHaveLength(2);
    expect(items.map(x => x.shape)).toEqual(['triangle', 'square']);
    for (const item of items) {
      expect(doc.textBetween(item.from, item.to, '')).toBe(item.original);
      expect(canReplaceSelectedGeometry({ ...item, document: doc }, doc)).toBe(true);
    }
  });

  it('excludes unknown and broken token fragments without scanning across text nodes', () => {
    const marker = geometryMarker('circle');
    const split = schema.nodes.paragraph.create(null, [
      schema.text(marker.slice(0, 13)),
      schema.text(marker.slice(13), [schema.marks.strong.create()])
    ]);
    const doc = schema.nodes.doc.create(null, [p('[[prolig-geometry:v2:circle]]'), split]);
    expect(listEditableGeometry(doc)).toEqual([]);
  });

  it('exposes shape list and keeps a document-identity recheck on replace', () => {
    const source = readFileSync('src/questions/QuestionStemWysiwygEditor.tsx', 'utf8');
    expect(source).toContain('Kayıtlı şekiller (');
    expect(source).toContain('listEditableGeometry(editor.state.doc)');
    expect(source).toContain('canReplaceSelectedGeometry(geometrySelection, editor.state.doc)');
  });
});
