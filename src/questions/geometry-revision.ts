import type { GeometryShape } from './geometry-svg';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { geometryTokenPattern,readGeometryMarker,type GeometryDrawing } from './geometry-parameters.js';
export function parseSelectedGeometry(source:string):GeometryShape|null{return readGeometryMarker(source)?.shape??null;}
export interface GeometryEditorSelection {from:number;to:number;original:string;document:unknown}
export interface GeometryLocation {from:number;to:number;original:string;shape:GeometryShape;drawing:GeometryDrawing}
export function canReplaceSelectedGeometry(selection:GeometryEditorSelection|null,doc:{
  textBetween(from:number,to:number,blockSeparator:string):string;
  nodeAt?(position:number):{type:{name:string};attrs:{marker?:unknown};nodeSize:number}|null
}):boolean{
  if(!selection||!readGeometryMarker(selection.original)||selection.document!==doc)return false;
  if(!Number.isSafeInteger(selection.from)||selection.from<1||!Number.isSafeInteger(selection.to)||selection.to<=selection.from)return false;
  const atom = doc.nodeAt?.(selection.from);
  if(atom?.type.name==='geometryShape'){
    return atom.nodeSize===selection.to-selection.from&&atom.attrs.marker===selection.original;
  }
  return doc.textBetween(selection.from,selection.to,'')===selection.original;
}
export function listEditableGeometry(doc:ProseMirrorNode):GeometryLocation[]{
  const result:GeometryLocation[]=[];
  doc.descendants((node,pos)=>{
    if(node.type.name==='geometryShape'){
      const original=typeof node.attrs.marker==='string'?node.attrs.marker:'';
      const drawing=readGeometryMarker(original);
      if(drawing)result.push({from:pos,to:pos+node.nodeSize,original,shape:drawing.shape,drawing});
      return false;
    }
    if(!node.isText||!node.text)return;
    for(const m of node.text.matchAll(geometryTokenPattern)){
      const drawing=readGeometryMarker(m[0]);if(!drawing)continue;
      const from=pos+(m.index??0);
      result.push({from,to:from+m[0].length,original:m[0],shape:drawing.shape,drawing});
    }
  });
  return result;
}
