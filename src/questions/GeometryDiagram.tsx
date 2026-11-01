import type { GeometryShape } from './geometry-svg';
import { defaultGeometry,type GeometryDrawing } from './geometry-parameters';
/** No untrusted SVG/HTML: bounded coordinates only. */
export function GeometryPrimitives({drawing}:{drawing:GeometryDrawing}){
  const v=drawing.values;
  if(drawing.shape==='triangle')return <>
    <polygon points={v[0]+','+v[1]+' '+v[2]+','+v[3]+' '+v[4]+','+v[5]} stroke="currentColor" strokeWidth="2" fill="none"/>
    {['A','B','C'].map((label,i)=><text key={label} x={Math.min(172,v[i*2]+3)} y={Math.max(10,v[i*2+1]-4)}>{label}</text>)}
  </>;
  if(drawing.shape==='circle')return <>
    <circle cx={v[0]} cy={v[1]} r={v[2]} stroke="currentColor" strokeWidth="2" fill="none"/>
    <circle cx={v[0]} cy={v[1]} r="2" fill="currentColor"/><text x={v[0]+4} y={v[1]-5}>O</text>
  </>;
  return <>
    <rect x={v[0]} y={v[1]} width={v[2]} height={v[2]} stroke="currentColor" strokeWidth="2" fill="none"/>
    {[[v[0],v[1],'A'],[v[0]+v[2],v[1],'B'],[v[0]+v[2],v[1]+v[2],'C'],[v[0],v[1]+v[2],'D']].map(([x,y,label])=>
      <text key={label} x={Math.min(173,Number(x)+3)} y={Math.max(10,Number(y)-4)}>{label}</text>)}
  </>;
}
export function GeometryDiagram({shape,values}:{shape:GeometryShape;values?:number[]}){
  const drawing=values?{shape,values}:defaultGeometry(shape);
  return <svg className="studio-geometry-diagram" viewBox="0 0 180 130" role="img"
    aria-label={shape==='triangle'?'ABC üçgeni':shape==='circle'?'O merkezli çember':'ABCD karesi'}>
    <GeometryPrimitives drawing={drawing}/>
  </svg>;
}
