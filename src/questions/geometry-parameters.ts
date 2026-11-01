import type { GeometryShape } from './geometry-svg';
export interface GeometryDrawing { shape: GeometryShape; values: number[] }
const presets: Record<GeometryShape,number[]>={triangle:[90,12,24,110,156,110],circle:[90,65,46],square:[44,19,91]};
export function defaultGeometry(shape: GeometryShape): GeometryDrawing {
  if (!Object.prototype.hasOwnProperty.call(presets,shape)) throw new Error('Unsupported shape');
  return {shape,values:[...presets[shape]]};
}
export function validGeometry(g:GeometryDrawing):boolean {
  if(!g||!Object.prototype.hasOwnProperty.call(presets,g.shape)||!Array.isArray(g.values)||g.values.some(n=>!Number.isSafeInteger(n)))return false;
  const v=g.values;
  if(g.shape==='triangle')return v.length===6&&v.every((n,i)=>n>=5&&n<=(i%2?125:175))&&
    Math.abs((v[2]-v[0])*(v[5]-v[1])-(v[4]-v[0])*(v[3]-v[1]))>=150;
  if(g.shape==='circle')return v.length===3&&v[2]>=8&&v[2]<=55&&v[0]-v[2]>=3&&v[0]+v[2]<=177&&v[1]-v[2]>=3&&v[1]+v[2]<=127;
  return v.length===3&&v[0]>=3&&v[1]>=3&&v[2]>=16&&v[2]<=120&&v[0]+v[2]<=177&&v[1]+v[2]<=127;
}
const v1=/^\[\[prolig-geometry:v1:(triangle|circle|square)\]\]$/;
const v2=/^\[\[prolig-geometry:v2:(triangle|circle|square):([0-9]{1,3}(?:,[0-9]{1,3}){2,5})\]\]$/;
export const geometryTokenPattern=/\[\[prolig-geometry:v(?:1:(?:triangle|circle|square)|2:(?:triangle|circle|square):[0-9]{1,3}(?:,[0-9]{1,3}){2,5})\]\]/g;
export function readGeometryMarker(token:string):GeometryDrawing|null {
  const old=v1.exec(token);if(old)return defaultGeometry(old[1] as GeometryShape);
  const match=v2.exec(token);if(!match)return null;
  const g={shape:match[1] as GeometryShape,values:match[2].split(',').map(Number)};
  return validGeometry(g)?g:null;
}
export function editableGeometryMarker(g:GeometryDrawing):string {
  if(!validGeometry(g))throw new Error('Invalid geometry coordinates');
  return '[[prolig-geometry:v2:'+g.shape+':'+g.values.join(',')+']]';
}
