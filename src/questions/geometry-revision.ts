import type { GeometryShape } from './geometry-svg';

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
