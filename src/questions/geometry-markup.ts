import type { GeometryShape } from './geometry-svg';

/**
 * Versioned, schema-free representation for the three *fixed* geometry
 * primitives. Only known enum members become SVG on read. Unknown/legacy
 * text is preserved literally for compatibility.
 */
const markerPattern = /\[\[prolig-geometry:v1:(triangle|circle|square)\]\]/g;
const allowedShapes: readonly string[] = ['triangle', 'circle', 'square'];

export type GeometryMarkupPiece =
  | { kind: 'text'; value: string }
  | { kind: 'geometry'; shape: GeometryShape };

export function geometryMarker(shape: GeometryShape): string {
  if (!allowedShapes.includes(shape)) throw new Error('Unsupported geometry shape');
  return '[[prolig-geometry:v1:' + shape + ']]';
}

export function splitGeometryMarkup(source: string): GeometryMarkupPiece[] {
  const pieces: GeometryMarkupPiece[] = [];
  let cursor = 0;
  for (const match of source.matchAll(markerPattern)) {
    const index = match.index ?? 0;
    if (index > cursor) pieces.push({ kind: 'text', value: source.slice(cursor, index) });
    pieces.push({ kind: 'geometry', shape: match[1] as GeometryShape });
    cursor = index + match[0].length;
  }
  if (cursor < source.length) pieces.push({ kind: 'text', value: source.slice(cursor) });
  return pieces;
}

export function containsGeometryMarkup(source: string): boolean {
  // Fail closed for future/unknown versions in publishing rather than
  // accidentally printing internal markers in a document.
  return source.includes('[[prolig-geometry:');
}
