import type { GeometryShape } from './geometry-svg';

/** SVG is built only from fixed trusted primitives; user text is never SVG markup. */
export function GeometryDiagram({ shape }: { shape: GeometryShape }) {
  const label = shape === 'triangle' ? 'ABC üçgeni' : shape === 'circle' ? 'O merkezli çember' : 'ABCD karesi';
  return <svg className="studio-geometry-diagram" viewBox="0 0 180 130" role="img" aria-label={label}>
    {shape === 'triangle' ? <>
      <polygon points="90,12 24,110 156,110" stroke="currentColor" strokeWidth="2" fill="none" />
      <text x="86" y="10">A</text><text x="9" y="122">B</text><text x="159" y="122">C</text>
    </> : shape === 'circle' ? <>
      <circle cx="90" cy="65" r="46" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="90" cy="65" r="2" fill="currentColor" /><text x="97" y="62">O</text>
    </> : <>
      <rect x="44" y="19" width="91" height="91" stroke="currentColor" strokeWidth="2" fill="none" />
      <text x="34" y="16">A</text><text x="141" y="16">B</text><text x="141" y="121">C</text><text x="34" y="121">D</text>
    </>}
  </svg>;
}
