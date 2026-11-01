import type { GeometryShape } from '../../../src/questions/geometry-svg.js';
import { splitGeometryMarkup } from '../../../src/questions/geometry-markup.js';
import { validGeometry } from '../../../src/questions/geometry-parameters.js';

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

const point=(x:number,y:number)=>'<a:pt x="'+x+'" y="'+y+'"/>';
const move=(x:number,y:number)=>'<a:moveTo>'+point(x,y)+'</a:moveTo>';
const line=(x:number,y:number)=>'<a:lnTo>'+point(x,y)+'</a:lnTo>';
/** Bounded custom path uses a fixed 180x130 coordinate system matching the editor. */
function customPath(shape:GeometryShape,v:number[]):string {
 if(shape==='triangle')return move(v[0],v[1])+line(v[2],v[3])+line(v[4],v[5])+'<a:close/>';
 if(shape==='square')return move(v[0],v[1])+line(v[0]+v[2],v[1])+line(v[0]+v[2],v[1]+v[2])+line(v[0],v[1]+v[2])+'<a:close/>';
 const [cx,cy,r]=v,k=Math.round(r*.55228475);
 const bez=(...p:number[])=>'<a:cubicBezTo>'+point(p[0],p[1])+point(p[2],p[3])+point(p[4],p[5])+'</a:cubicBezTo>';
 return move(cx+r,cy)+bez(cx+r,cy+k,cx+k,cy+r,cx,cy+r)+bez(cx-k,cy+r,cx-r,cy+k,cx-r,cy)+
 bez(cx-r,cy-k,cx-k,cy-r,cx,cy-r)+bez(cx+k,cy-r,cx+r,cy-k,cx+r,cy)+'<a:close/>';
}

export function wordGeometryDrawing(shape: GeometryShape, drawingId: number, values?:number[]): string {
  const definition = presets[shape];
  if (!definition || !Number.isSafeInteger(drawingId) || drawingId < 1) {
    throw new Error('Unsupported Word geometry');
  }
  if(values && !validGeometry({shape,values}))throw new Error('Invalid Word geometry');
  const size = String(DOCX_GEOMETRY_SIZE_EMU);
  const height = values ? String(Math.round(DOCX_GEOMETRY_SIZE_EMU*130/180)) : size;
  const shapeXml = values
    ? '<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/>'+
      '<a:pathLst><a:path w="180" h="130" fill="none">'+customPath(shape,values)+'</a:path></a:pathLst></a:custGeom>'
    : '<a:prstGeom prst="'+definition.preset+'"><a:avLst/></a:prstGeom>';
  const description = definition.label;
  return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">' +
    '<wp:extent cx="' + size + '" cy="' + height + '"/>' +
    '<wp:docPr id="' + drawingId + '" name="PRO-LIG geometri ' + drawingId +
      '" descr="' + description + '"/>' +
    '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
    '<a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">' +
    '<wps:wsp><wps:cNvSpPr/><wps:spPr>' +
    '<a:xfrm><a:off x="0" y="0"/><a:ext cx="' + size + '" cy="' + height + '"/></a:xfrm>' +
    shapeXml +
    '<a:noFill/><a:ln w="16000"><a:solidFill><a:srgbClr val="263B34"/></a:solidFill></a:ln>' +
    '</wps:spPr><wps:bodyPr/></wps:wsp></a:graphicData></a:graphic>' +
    '</wp:inline></w:drawing></w:r>';
}

export function wordGeometryCaption(shape: GeometryShape): string {
  const definition = presets[shape];
  if (!definition) throw new Error('Unsupported Word geometry');
  return definition.label;
}
