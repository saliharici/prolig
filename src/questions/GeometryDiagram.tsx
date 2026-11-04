import type { GeometryShape } from './geometry-svg';
import { defaultGeometry, type GeometryDrawing, type GeometryLabels } from './geometry-parameters';
import { layoutGeometryLabels } from './geometry-label-layout';

/** All labels are React-escaped text, never untrusted SVG or HTML. */
export function GeometryPrimitives({ drawing }: { drawing: GeometryDrawing }) {
  const v = drawing.values;
  const outline = drawing.shape === 'triangle'
    ? <polygon points={`${v[0]},${v[1]} ${v[2]},${v[3]} ${v[4]},${v[5]}`} stroke="currentColor" strokeWidth="2" fill="none" />
    : drawing.shape === 'circle'
      ? <><circle cx={v[0]} cy={v[1]} r={v[2]} stroke="currentColor" strokeWidth="2" fill="none" />
        <circle cx={v[0]} cy={v[1]} r="2" fill="currentColor" /></>
      : <rect x={v[0]} y={v[1]} width={v[2]} height={v[2]} stroke="currentColor" strokeWidth="2" fill="none" />;
  return <>{outline}{layoutGeometryLabels(drawing).map((label, index) =>
    <text key={`${label.kind}-${index}`} x={label.x} y={label.y} textAnchor="middle"
      fontSize="10" fontFamily="Arial, sans-serif" fill="currentColor">{label.value}</text>)}</>;
}

export function GeometryDiagram({ shape, values, labels }: { shape: GeometryShape; values?: number[]; labels?: GeometryLabels }) {
  const drawing = { ...defaultGeometry(shape), ...(values ? { values } : {}), ...(labels ? { labels } : {}) };
  return <svg className="studio-geometry-diagram" viewBox="0 0 180 130" role="img"
    aria-label={shape === 'triangle' ? 'Üçgen çizimi' : shape === 'circle' ? 'Çember çizimi' : 'Kare çizimi'}>
    <GeometryPrimitives drawing={drawing} />
  </svg>;
}
