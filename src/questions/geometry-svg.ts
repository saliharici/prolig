/** Trusted geometry primitives only: never interpolate user-provided SVG markup. */
export type GeometryShape = 'triangle' | 'circle' | 'square';

export function geometrySvg(shape: GeometryShape): string {
  const opening = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 130" width="540" height="390" role="img">';
  const ink = 'stroke="#263b34" stroke-width="2" fill="none"';
  const drawing = shape === 'triangle'
    ? '<polygon points="90,12 24,110 156,110" ' + ink + '/><text x="86" y="10">A</text><text x="9" y="122">B</text><text x="159" y="122">C</text>'
    : shape === 'circle'
    ? '<circle cx="90" cy="65" r="46" ' + ink + '/><circle cx="90" cy="65" r="2" fill="#263b34"/><text x="97" y="62">O</text>'
    : '<rect x="44" y="19" width="91" height="91" ' + ink + '/><text x="34" y="16">A</text><text x="141" y="16">B</text><text x="141" y="121">C</text><text x="34" y="121">D</text>';
  return opening + '<g font-family="Arial,sans-serif" font-size="12" fill="#263b34">' + drawing + '</g></svg>';
}

export function geometryFileName(shape: GeometryShape): string {
  return 'prolig-geometri-' + shape + '.svg';
}
