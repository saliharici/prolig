import { defaultGeometry, validGeometry, type GeometryDrawing } from './geometry-parameters.js';
export type GeometryShape='triangle'|'circle'|'square';
export function geometrySvg(shape:GeometryShape,drawing:GeometryDrawing=defaultGeometry(shape)):string{
 if(!validGeometry(drawing)||drawing.shape!==shape)throw new Error('Invalid geometry');
 const v=drawing.values;
 const ink='stroke="#263b34" stroke-width="2" fill="none"';
 const body=shape==='triangle'?'<polygon points="'+v[0]+','+v[1]+' '+v[2]+','+v[3]+' '+v[4]+','+v[5]+'" '+ink+'/>':
 shape==='circle'?'<circle cx="'+v[0]+'" cy="'+v[1]+'" r="'+v[2]+'" '+ink+'/>':
 '<rect x="'+v[0]+'" y="'+v[1]+'" width="'+v[2]+'" height="'+v[2]+'" '+ink+'/>';
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 130" width="540" height="390" role="img"><g font-family="Arial,sans-serif" font-size="12" fill="#263b34">'+body+'</g></svg>';
}
export function geometryFileName(shape:GeometryShape):string{return 'prolig-geometri-'+shape+'.svg';}
