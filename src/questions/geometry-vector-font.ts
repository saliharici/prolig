/** Word DrawingML outline glyphs: readable labels inside a native editable vector shape. */
import type { DiagramLabel } from './geometry-label-layout';
import { OUTLINE_UNITS, OUTLINE_GLYPHS } from './geometry-outline-glyphs.js';

const scale = 13 / OUTLINE_UNITS;
const pt = (x: number, y: number) => `<a:pt x="${Math.round(x)}" y="${Math.round(y)}"/>`;

/** Each label is one filled DrawingML custom path, not an image or external font. */
export function wordLabelPaths(labels: DiagramLabel[]): string {
  let shapes = '';
  for (const label of labels) {
    const glyphs = Array.from(label.value, char => OUTLINE_GLYPHS[char]);
    if (glyphs.some(g => !g)) throw new Error('Unsupported Word vector glyph');
    const advance = glyphs.reduce((total, glyph) => total + glyph.w * scale, 0);
    let x = label.x - advance / 2;
    const y = label.y;
    let segments = '';
    for (const glyph of glyphs) {
      for (const item of glyph.p) {
        const cmd = item[0];
        const pointAt = (index: number) => pt(x + Number(item[index]) * scale, y - Number(item[index + 1]) * scale);
        if (cmd === 'M') segments += '<a:moveTo>' + pointAt(1) + '</a:moveTo>';
        else if (cmd === 'L') segments += '<a:lnTo>' + pointAt(1) + '</a:lnTo>';
        else if (cmd === 'C') segments += '<a:cubicBezTo>' + pointAt(1) + pointAt(3) + pointAt(5) + '</a:cubicBezTo>';
        else if (cmd === 'Z') segments += '<a:close/>';
      }
      x += glyph.w * scale;
    }
    if (segments) shapes += '<a:path w="180" h="130" fill="norm">' + segments + '</a:path>';
  }
  return shapes;
}
