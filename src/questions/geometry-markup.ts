import type { GeometryShape } from './geometry-svg';
import { geometryTokenPattern, readGeometryMarker, type GeometryLabels } from './geometry-parameters.js';
export type GeometryMarkupPiece =
  | { kind: 'text'; value: string }
  | { kind: 'geometry'; shape: GeometryShape; values?: number[]; labels?: GeometryLabels };
/** Existing v1 marker remains readable and unchanged. */
export function geometryMarker(shape: GeometryShape): string {
  if (!['triangle', 'circle', 'square'].includes(shape)) throw new Error('Unsupported geometry shape');
  return '[[prolig-geometry:v1:' + shape + ']]';
}
export function splitGeometryMarkup(source: string): GeometryMarkupPiece[] {
  const pieces: GeometryMarkupPiece[] = [];
  let cursor = 0;
  for (const match of source.matchAll(geometryTokenPattern)) {
    const drawing = readGeometryMarker(match[0]);
    if (!drawing) continue;
    const index = match.index ?? 0;
    if (index > cursor) pieces.push({ kind: 'text', value: source.slice(cursor, index) });
    if (match[0].includes(':v1:')) pieces.push({ kind: 'geometry', shape: drawing.shape });
    else if (drawing.labels) pieces.push({ kind: 'geometry', shape: drawing.shape, values: drawing.values, labels: drawing.labels });
    else pieces.push({ kind: 'geometry', shape: drawing.shape, values: drawing.values });
    cursor = index + match[0].length;
  }
  if (cursor < source.length) pieces.push({ kind: 'text', value: source.slice(cursor) });
  return pieces;
}
export function containsGeometryMarkup(source: string): boolean { return source.includes('[[prolig-geometry:'); }
