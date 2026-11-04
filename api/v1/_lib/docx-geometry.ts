import type { GeometryShape } from '../../../src/questions/geometry-svg.js';
import { splitGeometryMarkup } from '../../../src/questions/geometry-markup.js';
import { defaultGeometry, validGeometry, type GeometryDrawing, type GeometryLabels } from '../../../src/questions/geometry-parameters.js';
import { layoutGeometryLabels } from '../../../src/questions/geometry-label-layout.js';
import { wordLabelPaths } from '../../../src/questions/geometry-vector-font.js';

/** All geometry is emitted as editable Word DrawingML paths (including glyphs). */
const descriptions: Record<GeometryShape, string> = {
  triangle: 'Üçgen', circle: 'Çember', square: 'Kare'
};
export const DOCX_GEOMETRY_SIZE_EMU = 1_800_000;

export function knownGeometryOnly(source: string): boolean {
  const unknown = splitGeometryMarkup(source).filter(piece => piece.kind === 'text')
    .map(piece => piece.value).join('');
  return !unknown.includes('[[prolig-geometry:');
}

const pt = (x: number, y: number) => `<a:pt x="${x}" y="${y}"/>`;
const move = (x: number, y: number) => '<a:moveTo>' + pt(x, y) + '</a:moveTo>';
const line = (x: number, y: number) => '<a:lnTo>' + pt(x, y) + '</a:lnTo>';
function customPath(shape: GeometryShape, v: number[]): string {
  if (shape === 'triangle') return move(v[0], v[1]) + line(v[2], v[3]) + line(v[4], v[5]) + '<a:close/>';
  if (shape === 'square') return move(v[0], v[1]) + line(v[0] + v[2], v[1]) +
    line(v[0] + v[2], v[1] + v[2]) + line(v[0], v[1] + v[2]) + '<a:close/>';
  const [cx, cy, r] = v, k = Math.round(r * .55228475);
  const bez = (...p: number[]) => '<a:cubicBezTo>' + pt(p[0], p[1]) + pt(p[2], p[3]) + pt(p[4], p[5]) + '</a:cubicBezTo>';
  return move(cx + r, cy) + bez(cx + r, cy + k, cx + k, cy + r, cx, cy + r) +
    bez(cx - k, cy + r, cx - r, cy + k, cx - r, cy) +
    bez(cx - r, cy - k, cx - k, cy - r, cx, cy - r) +
    bez(cx + k, cy - r, cx + r, cy - k, cx + r, cy) + '<a:close/>';
}
const escapeAttribute = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Word-only correction for crowded center (O) and angle labels.
 * Work on the rendered vector-glyph outlines, not the saved geometry data:
 * labels and circle geometry remain editable and the editor is unchanged.
 *
 * The previous guard skipped cases where outlines overlapped by more than
 * three coordinate units. It also considered only the first numeric label.
 * Apply the smallest bounded move to the closest eligible right-hand label.
 */
function wordCircleLabelPaths(labels: ReturnType<typeof layoutGeometryLabels>): string {
  const centerIndex = labels.findIndex(label => label.value.trim() === 'O');
  if (centerIndex < 0) return wordLabelPaths(labels);

  const paths = labels.map(label => wordLabelPaths([label]));
  function bounds(xml: string): { left: number; right: number; top: number; bottom: number } | null {
    const points = Array.from(xml.matchAll(/<a:pt x="(-?\d+)" y="(-?\d+)"\/>/g));
    if (!points.length) return null;
    const xs = points.map(match => Number(match[1]));
    const ys = points.map(match => Number(match[2]));
    return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
  }
  const center = bounds(paths[centerIndex]);
  if (!center) return wordLabelPaths(labels);

  const minimumGap = 11;    // DrawingML viewBox units (180 wide).
  const canvasMargin = 6;
  let candidate: { index: number; gap: number; box: NonNullable<ReturnType<typeof bounds>> } | null = null;
  for (let index = 0; index < labels.length; index++) {
    if (index === centerIndex || !/^\d{1,3}°?$/.test(labels[index].value.trim())) continue;
    const box = bounds(paths[index]);
    if (!box) continue;
    // Never move a label to the left of, or far away from, the center.
    if (box.left + box.right <= center.left + center.right) continue;
    if (box.top > center.bottom + 2 || box.bottom < center.top - 2) continue;
    const gap = box.left - center.right;
    if (gap >= minimumGap || gap < -15) continue;
    if (!candidate || Math.abs(gap) < Math.abs(candidate.gap)) candidate = { index, gap, box };
  }
  if (!candidate) return wordLabelPaths(labels);

  const required = Math.ceil(minimumGap - candidate.gap);
  if (required < 1 || required > 26) return wordLabelPaths(labels);
  // Prefer to move the angle value; only if it hits the canvas boundary,
  // nudge the center label slightly in the opposite direction.
  const angleShift = Math.min(required, Math.max(0, 174 - candidate.box.right));
  const centerShift = required - angleShift;
  if (centerShift > 8 || center.left - centerShift < canvasMargin) return wordLabelPaths(labels);

  const shiftPath = (xml: string, dx: number): string => xml.replace(
    /<a:pt x="(-?\d+)" y="(-?\d+)"\/>/g,
    (_match, x: string, y: string) => `<a:pt x="${Number(x) + dx}" y="${y}"/>`
  );
  if (angleShift) paths[candidate.index] = shiftPath(paths[candidate.index], angleShift);
  if (centerShift) paths[centerIndex] = shiftPath(paths[centerIndex], -centerShift);
  return paths.join('');
}

/** v1/v2/v3 all render the actual shape PLUS labels in one editable vector. */
export function wordGeometryDrawing(shape: GeometryShape, drawingId: number, values?: number[], labels?: GeometryLabels): string {
  if (!Object.prototype.hasOwnProperty.call(descriptions, shape) || !Number.isSafeInteger(drawingId) || drawingId < 1)
    throw new Error('Unsupported Word geometry');
  const drawing: GeometryDrawing = { shape, values: values ?? defaultGeometry(shape).values, ...(labels ? { labels } : {}) };
  if (!validGeometry(drawing)) throw new Error('Invalid Word geometry');
  const size = String(DOCX_GEOMETRY_SIZE_EMU);
  const height = String(Math.round(DOCX_GEOMETRY_SIZE_EMU * 130 / 180));
  const geometry = '<a:path w="180" h="130" fill="none">' + customPath(shape, drawing.values) + '</a:path>';
  const texts = layoutGeometryLabels(drawing);
  const vectorLabels = shape === 'circle' ? wordCircleLabelPaths(texts) : wordLabelPaths(texts);
  const accessibleText = descriptions[shape] + '; ' + texts.map(label => label.value).join(' ');
  return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">' +
    '<wp:extent cx="' + size + '" cy="' + height + '"/>' +
    '<wp:docPr id="' + drawingId + '" name="PRO-LIG geometri ' + drawingId +
    '" descr="' + escapeAttribute(accessibleText) + '"/>' +
    '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
    '<a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">' +
    '<wps:wsp><wps:cNvSpPr/><wps:spPr>' +
    '<a:xfrm><a:off x="0" y="0"/><a:ext cx="' + size + '" cy="' + height + '"/></a:xfrm>' +
    '<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/>' +
    '<a:pathLst>' + geometry + vectorLabels + '</a:pathLst></a:custGeom>' +
    '<a:solidFill><a:srgbClr val="263B34"/></a:solidFill><a:ln w="9000"><a:solidFill><a:srgbClr val="263B34"/></a:solidFill></a:ln>' +
    '</wps:spPr><wps:bodyPr/></wps:wsp></a:graphicData></a:graphic>' +
    '</wp:inline></w:drawing></w:r>';
}

export function wordGeometryCaption(shape: GeometryShape): string {
  if (!Object.prototype.hasOwnProperty.call(descriptions, shape)) throw new Error('Unsupported Word geometry');
  return descriptions[shape];
}
