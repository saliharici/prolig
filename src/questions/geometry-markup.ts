import type { GeometryShape } from './geometry-svg';
import { geometryTokenPattern,readGeometryMarker } from './geometry-parameters.js';
export type GeometryMarkupPiece={kind:'text';value:string}|{kind:'geometry';shape:GeometryShape;values?:number[]};
/** Existing v1 markers are unchanged, and stay fully readable. */
export function geometryMarker(shape:GeometryShape):string{
  if(!['triangle','circle','square'].includes(shape))throw new Error('Unsupported geometry shape');
  return '[[prolig-geometry:v1:'+shape+']]';
}
export function splitGeometryMarkup(source:string):GeometryMarkupPiece[]{
  const pieces:GeometryMarkupPiece[]=[];let cursor=0;
  for(const match of source.matchAll(geometryTokenPattern)){
    const drawing=readGeometryMarker(match[0]);if(!drawing)continue;
    const index=match.index??0;
    if(index>cursor)pieces.push({kind:'text',value:source.slice(cursor,index)});
    pieces.push(match[0].includes(':v2:')?{kind:'geometry',shape:drawing.shape,values:drawing.values}:{kind:'geometry',shape:drawing.shape});
    cursor=index+match[0].length;
  }
  if(cursor<source.length)pieces.push({kind:'text',value:source.slice(cursor)});
  return pieces;
}
export function containsGeometryMarkup(source:string):boolean{return source.includes('[[prolig-geometry:');}
