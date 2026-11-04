import type { GeometryShape } from './geometry-svg';

/** Release-07B annotations are additive. Legacy v1 and v2 remain byte-for-byte compatible. */
export interface GeometryLabels { points: string[]; sides: string[]; angles: string[] }
export interface GeometryDrawing { shape: GeometryShape; values: number[]; labels?: GeometryLabels }

const presets: Record<GeometryShape, number[]> = {
  triangle: [90, 12, 24, 110, 156, 110],
  circle: [90, 65, 46],
  square: [44, 19, 91]
};
const shapeCounts: Record<GeometryShape, [number, number, number]> = {
  triangle: [3, 3, 3], circle: [1, 1, 0], square: [4, 4, 4]
};

export function defaultGeometry(shape: GeometryShape): GeometryDrawing {
  if (!Object.prototype.hasOwnProperty.call(presets, shape)) throw new Error('Unsupported shape');
  return { shape, values: [...presets[shape]] };
}

export function defaultGeometryLabels(shape: GeometryShape): GeometryLabels {
  if (!Object.prototype.hasOwnProperty.call(shapeCounts, shape)) throw new Error('Unsupported shape');
  const [pointCount, sideCount, angleCount] = shapeCounts[shape];
  return {
    points: (shape === 'circle' ? ['O'] : ['A', 'B', 'C', 'D']).slice(0, pointCount),
    sides: Array(sideCount).fill(''),
    angles: Array(angleCount).fill('')
  };
}

/** Deliberately conservative alphabet: every allowed character has a Word vector glyph. */
const pointPattern = /^[A-Z]{1,2}$/;
const measurementPattern = /^[A-Z0-9cmkg .,=+\-/°]{0,12}$/;
const anglePattern = /^[0-9 .,°]{0,9}$/;

export function validGeometryLabels(shape: GeometryShape, labels: GeometryLabels): boolean {
  if (!Object.prototype.hasOwnProperty.call(shapeCounts, shape) || !labels || typeof labels !== 'object') return false;
  const [p, s, a] = shapeCounts[shape];
  if (!Array.isArray(labels.points) || !Array.isArray(labels.sides) || !Array.isArray(labels.angles)) return false;
  if (labels.points.length !== p || labels.sides.length !== s || labels.angles.length !== a) return false;
  if (!labels.points.every(text => typeof text === 'string' && pointPattern.test(text))) return false;
  if (new Set(labels.points).size !== labels.points.length) return false;
  if (!labels.sides.every(text => typeof text === 'string' && measurementPattern.test(text))) return false;
  if (!labels.angles.every(text => typeof text === 'string' && anglePattern.test(text))) return false;
  return true;
}

export function geometryLabelsFor(drawing: GeometryDrawing): GeometryLabels {
  return drawing.labels ?? defaultGeometryLabels(drawing.shape);
}

export function withGeometryLabel(drawing: GeometryDrawing, field: keyof GeometryLabels, index: number, value: string): GeometryDrawing {
  const labels = geometryLabelsFor(drawing);
  const next: GeometryLabels = { points: [...labels.points], sides: [...labels.sides], angles: [...labels.angles] };
  if (!Number.isInteger(index) || index < 0 || index >= next[field].length) return drawing;
  next[field][index] = value;
  const result = { ...drawing, values: [...drawing.values], labels: next };
  return validGeometry(result) ? result : drawing;
}

export function validGeometry(g: GeometryDrawing): boolean {
  if (!g || !Object.prototype.hasOwnProperty.call(presets, g.shape) || !Array.isArray(g.values) ||
      g.values.some(n => !Number.isSafeInteger(n))) return false;
  if (g.labels !== undefined && !validGeometryLabels(g.shape, g.labels)) return false;
  const v = g.values;
  if (g.shape === 'triangle') return v.length === 6 && v.every((n, i) => n >= 5 && n <= (i % 2 ? 125 : 175)) &&
    Math.abs((v[2] - v[0]) * (v[5] - v[1]) - (v[4] - v[0]) * (v[3] - v[1])) >= 150;
  if (g.shape === 'circle') return v.length === 3 && v[2] >= 8 && v[2] <= 55 &&
    v[0] - v[2] >= 3 && v[0] + v[2] <= 177 && v[1] - v[2] >= 3 && v[1] + v[2] <= 127;
  return v.length === 3 && v[0] >= 3 && v[1] >= 3 && v[2] >= 16 && v[2] <= 120 &&
    v[0] + v[2] <= 177 && v[1] + v[2] <= 127;
}

const coords = '[0-9]{1,3}(?:,[0-9]{1,3}){2,5}';
const shapes = '(?:triangle|circle|square)';
const v1 = /^\[\[prolig-geometry:v1:(triangle|circle|square)\]\]$/;
const v2 = new RegExp('^\\[\\[prolig-geometry:v2:(triangle|circle|square):(' + coords + ')\\]\\]$');
const v3 = new RegExp('^\\[\\[prolig-geometry:v3:(triangle|circle|square):(' + coords + '):([A-Za-z0-9_-]{12,700})\\]\\]$');
export const geometryTokenPattern = new RegExp('\\[\\[prolig-geometry:(?:v1:' + shapes + '|v2:' + shapes + ':' + coords + '|v3:' + shapes + ':' + coords + ':[A-Za-z0-9_-]{12,700})\\]\\]', 'g');

function encodeLabels(labels: GeometryLabels): string {
  const bytes = new TextEncoder().encode(JSON.stringify({ p: labels.points, s: labels.sides, a: labels.angles }));
  return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeLabels(payload: string): GeometryLabels | null {
  try {
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - payload.length % 4) % 4);
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const raw = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) ||
        Object.keys(raw).sort().join(',') !== 'a,p,s') return null;
    const labels = { points: raw.p, sides: raw.s, angles: raw.a } as GeometryLabels;
    // Canonical encoding rejects ambiguities or special JSON structure.
    return encodeLabels(labels) === payload ? labels : null;
  } catch { return null; }
}

export function readGeometryMarker(token: string): GeometryDrawing | null {
  const old = v1.exec(token);
  if (old) return defaultGeometry(old[1] as GeometryShape);
  const match2 = v2.exec(token);
  if (match2) {
    const g: GeometryDrawing = { shape: match2[1] as GeometryShape, values: match2[2].split(',').map(Number) };
    return validGeometry(g) ? g : null;
  }
  const match3 = v3.exec(token);
  if (!match3) return null;
  const labels = decodeLabels(match3[3]);
  if (!labels) return null;
  const g: GeometryDrawing = { shape: match3[1] as GeometryShape, values: match3[2].split(',').map(Number), labels };
  return validGeometry(g) ? g : null;
}

export function editableGeometryMarker(g: GeometryDrawing): string {
  if (!validGeometry(g)) throw new Error('Invalid geometry coordinates or annotations');
  if (g.labels === undefined) return '[[prolig-geometry:v2:' + g.shape + ':' + g.values.join(',') + ']]';
  return '[[prolig-geometry:v3:' + g.shape + ':' + g.values.join(',') + ':' + encodeLabels(g.labels) + ']]';
}
