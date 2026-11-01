import { useRef,useState } from 'react';
import type { PointerEvent } from 'react';
import { GeometryPrimitives } from './GeometryDiagram';
import { validGeometry,type GeometryDrawing } from './geometry-parameters';
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,Math.round(v)));
const handles=(g:GeometryDrawing):Array<[number,number]>=>{
  const v=g.values;
  return g.shape==='triangle'?[[v[0],v[1]],[v[2],v[3]],[v[4],v[5]]]:
    g.shape==='circle'?[[v[0],v[1]],[v[0]+v[2],v[1]]]:
      [[v[0],v[1]],[v[0]+v[2],v[1]+v[2]]];
};
export function updateGeometryHandle(g:GeometryDrawing,i:number,x:number,y:number):GeometryDrawing {
  const v=[...g.values];
  if(g.shape==='triangle'){
    if(i<0||i>2)return g;
    v[2*i]=clamp(x,5,175);v[2*i+1]=clamp(y,5,125);
  }else if(g.shape==='circle'){
    if(i===0){v[0]=clamp(x,v[2]+3,177-v[2]);v[1]=clamp(y,v[2]+3,127-v[2]);}
    else if(i===1)v[2]=clamp(Math.abs(x-v[0]),8,Math.min(55,v[0]-3,177-v[0],v[1]-3,127-v[1]));
    else return g;
  }else{
    if(i===0){v[0]=clamp(x,3,177-v[2]);v[1]=clamp(y,3,127-v[2]);}
    else if(i===1)v[2]=clamp(Math.max(x-v[0],y-v[1]),16,Math.min(120,177-v[0],127-v[1]));
    else return g;
  }
  const updated={shape:g.shape,values:v};
  return validGeometry(updated)?updated:g;
}
export function DraggableGeometry({value,onChange,disabled=false}:{value:GeometryDrawing;onChange:(g:GeometryDrawing)=>void;disabled?:boolean}){
  const [active,setActive]=useState<number|null>(null);
  const activeRef=useRef<number|null>(null);
  const point=(event:PointerEvent<SVGCircleElement>):[number,number]|null=>{
    const ctm=event.currentTarget.ownerSVGElement?.getScreenCTM();
    if(!ctm)return null;
    const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(ctm.inverse());
    return [p.x,p.y];
  };
  const move=(event:PointerEvent<SVGCircleElement>)=>{
    if(disabled||activeRef.current===null)return;
    const p=point(event);
    if(p)onChange(updateGeometryHandle(value,activeRef.current,p[0],p[1]));
  };
  const end=(event:PointerEvent<SVGCircleElement>)=>{
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
    activeRef.current=null;setActive(null);
  };
  return <div className="release07-geometry-editor">
    <svg className="p3-shape-preview release07-drag-canvas" viewBox="0 0 180 130" role="group" aria-label="Fareyle düzenlenebilir geometrik şekil">
      <GeometryPrimitives drawing={value}/>
      {!disabled&&handles(value).map(([x,y],i)=><circle key={i} cx={x} cy={y} r={active===i?5.5:4.5}
        className="release07-handle" role="slider" tabIndex={0} aria-label={value.shape==='triangle'?['A noktası','B noktası','C noktası'][i]:i===0?'Konum':'Boyut'}
        onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);activeRef.current=i;setActive(i);}}
        onPointerMove={move} onPointerUp={end} onPointerCancel={end}
        onKeyDown={e=>{
          const delta=e.shiftKey?5:1;let nextX=x,nextY=y;
          if(e.key==='ArrowLeft')nextX-=delta;else if(e.key==='ArrowRight')nextX+=delta;
          else if(e.key==='ArrowUp')nextY-=delta;else if(e.key==='ArrowDown')nextY+=delta;
          else return;
          e.preventDefault();onChange(updateGeometryHandle(value,i,nextX,nextY));
        }}/>)}
    </svg>
    <small>Noktaları sürükleyin veya ok tuşlarını kullanın (Shift: 5 birim). Çizimi metne eklemek/güncellemek için aşağıdaki düğmeyi kullanın.</small>
  </div>;
}
