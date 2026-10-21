import type { GeometryShape } from './geometry-svg';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

const canonicalMarker = /^\[\[prolig-geometry:v1:(triangle|circle|square)\]\]$/;

/** Only a whole, known v1 marker is editable. Partial or future versions fail closed. */
export function parseSelectedGeometry(source: string): GeometryShape | null {
  return (canonicalMarker.exec(source)?.[1] as GeometryShape | undefined) ?? null;
}

export interface GeometryEditorSelection {
  from: number;
  to: number;
  original: string;
  /** Identity of ProseMirror immutable document at selection time. */
  document: unknown;
}

/** Reject stale offsets if *any* editor document change intervened. */
export function canReplaceSelectedGeometry(
  selection: GeometryEditorSelection | null,
  currentDocument: { textBetween(from: number, to: number, blockSeparator: string): string }
): boolean {
  if (!selection || !parseSelectedGeometry(selection.original)) return false;
  if (selection.document !== currentDocument) return false;
  if (!Number.isSafeInteger(selection.from) || selection.from < 1 ||
      !Number.isSafeInteger(selection.to) || selection.to <= selection.from) return false;
  return currentDocument.textBetween(selection.from, selection.to, '') === selection.original;
}


/** Each editable marker is located inside one ProseMirror text node. */
export interface GeometryLocation {
  from: number;
  to: number;
  original: string;
  shape: GeometryShape;
}



const geometryTokenPattern = /\[\[prolig-geometry:v1:(triangle|circle|square)\]\]/g;

/**
 * Enumerate persisted geometry in document order using *document offsets*,
 * not offsets from editor.getText() (which loses paragraph boundaries).
 * Deliberately ignore partial/unknown/split tokens.
 */
export function listEditableGeometry(doc: ProseMirrorNode): GeometryLocation[] {
  const locations: GeometryLocation[] = [];
  doc.descendants((node, position) => {
    if (!node.isText || !node.text) return;
    for (const match of node.text.matchAll(geometryTokenPattern)) {
      const from = position + (match.index ?? 0);
      locations.push({
        from,
        to: from + match[0].length,
        original: match[0],
        shape: match[1] as GeometryShape
      });
    }
  });
  return locations;
}
