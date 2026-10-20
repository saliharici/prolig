import type { GeometryShape } from '../../../src/questions/geometry-svg.js';
import { splitGeometryMarkup } from '../../../src/questions/geometry-markup.js';

/**
 * Word 2010+ WordprocessingShape (wps) DrawingML.
 * The only shape input is the fixed P3 geometric enum, never user SVG/XML.
 * Native preset shapes remain vectors that Word can resize or edit.
 */
const presets: Record<GeometryShape, { preset: string; label: string }> = {
  triangle: { preset: 'triangle', label: 'ABC üçgeni' },
  circle: { preset: 'ellipse', label: 'O merkezli çember' },
  square: { preset: 'rect', label: 'ABCD karesi' }
};

export const DOCX_GEOMETRY_SIZE_EMU = 1_280_000;

export function knownGeometryOnly(source: string): boolean {
  // Fail closed for unsupported future versions rather than losing a figure.
  const withoutKnown = splitGeometryMarkup(source).filter(piece => piece.kind === 'text')
    .map(piece => piece.value).join('');
  return !withoutKnown.includes('[[prolig-geometry:');
}

export function wordGeometryDrawing(shape: GeometryShape, drawingId: number): string {
  const definition = presets[shape];
  if (!definition || !Number.isSafeInteger(drawingId) || drawingId < 1) {
    throw new Error('Unsupported Word geometry');
  }
  const size = String(DOCX_GEOMETRY_SIZE_EMU);
  const description = definition.label;
  return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">' +
    '<wp:extent cx="' + size + '" cy="' + size + '"/>' +
    '<wp:docPr id="' + drawingId + '" name="PRO-LIG geometri ' + drawingId +
      '" descr="' + description + '"/>' +
    '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
    '<a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">' +
    '<wps:wsp><wps:cNvSpPr/><wps:spPr>' +
    '<a:xfrm><a:off x="0" y="0"/><a:ext cx="' + size + '" cy="' + size + '"/></a:xfrm>' +
    '<a:prstGeom prst="' + definition.preset + '"><a:avLst/></a:prstGeom>' +
    '<a:noFill/><a:ln w="16000"><a:solidFill><a:srgbClr val="263B34"/></a:solidFill></a:ln>' +
    '</wps:spPr><wps:bodyPr/></wps:wsp></a:graphicData></a:graphic>' +
    '</wp:inline></w:drawing></w:r>';
}

export function wordGeometryCaption(shape: GeometryShape): string {
  const definition = presets[shape];
  if (!definition) throw new Error('Unsupported Word geometry');
  return definition.label;
}
