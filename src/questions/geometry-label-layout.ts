import type { GeometryDrawing } from './geometry-parameters.js';
import { geometryLabelsFor } from './geometry-parameters.js';

export type DiagramLabel = { value: string; x: number; y: number; kind: 'point' | 'side' | 'angle' };
type Pair = [number, number];
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const at = (x: number, y: number, value: string, kind: DiagramLabel['kind']): DiagramLabel => {
  // x is the approximate label centre and y the text baseline (SVG/Word share viewBox).
  // RELEASE-07B-V6 numeric degree display
  const shown = kind === 'angle' && /^\d+(?:[.,]\d+)?$/.test(value.trim())
    ? value.trim() + '°' : value;
  const width = Math.max(8, shown.length * 10.2);
  return { x: Math.round(clamp(x, width / 2 + 3, 177 - width / 2)), y: Math.round(clamp(y, 11, 126)), value: shown, kind };
};

/** Deterministic placements shared by SVG preview and editable Word vector glyphs. */
export function layoutGeometryLabels(g: GeometryDrawing): DiagramLabel[] {
  const l = geometryLabelsFor(g);
  const v = g.values;
  if (g.shape === 'circle') {
    const [cx, cy, r] = v;
    const items = [at(cx + 9, cy - 5, l.points[0], 'point')];
    if (l.sides[0]) items.push(at(cx + r / 2, cy - 8, l.sides[0], 'side'));
    return items;
  }
  const pts: Pair[] = g.shape === 'triangle'
    ? [[v[0], v[1]], [v[2], v[3]], [v[4], v[5]]]
    : [[v[0], v[1]], [v[0] + v[2], v[1]], [v[0] + v[2], v[1] + v[2]], [v[0], v[1] + v[2]]];
  const center: Pair = [pts.reduce((sum, p) => sum + p[0], 0) / pts.length, pts.reduce((sum, p) => sum + p[1], 0) / pts.length];
  const outward = (x: number, y: number, distance: number): Pair => {
    const dx = x - center[0], dy = y - center[1];
    const size = Math.hypot(dx, dy) || 1;
    return [x + distance * dx / size, y + distance * dy / size];
  };
  const labels: DiagramLabel[] = [];
  pts.forEach(([x, y], i) => {
    const [lx, ly] = outward(x, y, 13);
    // Near the upper canvas boundary, put the label beside the handle instead
    // of clamping it directly on top of the drag circle (also affects Word).
    labels.push(ly < 18 ? at(x + (x > 135 ? -19 : 19), y + 3, l.points[i], 'point')
      : at(lx, ly + 4, l.points[i], 'point'));
  });
  pts.forEach(([x, y], i) => {
    const [nx, ny] = pts[(i + 1) % pts.length];
    if (!l.sides[i]) return;
    const [lx, ly] = outward((x + nx) / 2, (y + ny) / 2, 10);
    labels.push(at(lx, ly + 3, l.sides[i], 'side'));
  });
  pts.forEach(([x, y], i) => {
    if (!l.angles[i]) return;
    const dx = center[0] - x, dy = center[1] - y, size = Math.hypot(dx, dy) || 1;
    labels.push(at(x + dx * 21 / size, y + dy * 21 / size + 3, l.angles[i], 'angle'));
  });
  return labels;
}
