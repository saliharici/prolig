export interface UnitTask {
  id:number;title:string;writer:string|null;status:string;dueDate:string;
  target:number;written:number;approved:number;inReview:number;revision:number;
}
export interface ProductionUnit {
  id:number;projectId:number;title:string;sortOrder:number;target:number;dueDate:string|null;
  assigned:number;allocationGap:number;overAllocated:number;written:number;approved:number;
  inReview:number;revision:number;missing:number;completionPercent:number;overdue:boolean;tasks:UnitTask[];
}
export interface ProductionPlan {
  projectId:number;canManage:boolean;units:ProductionUnit[];
  summary:{totalTarget:number;approved:number;missing:number;overdueUnits:number;unallocatedTasks:number;ready:boolean};
}
export async function fetchProductionPlan(projectId:number):Promise<ProductionPlan>{
  const res=await fetch('/api/v1/production-plan?projectId='+projectId,{credentials:'include',cache:'no-store'});
  if(!res.ok){
    const body=await res.json().catch(()=>({}));
    throw new Error(typeof body.error==='string'?body.error:'Üretim planı yüklenemedi.');
  }
  return res.json();
}
export async function saveProductionUnit(projectId:number,input:{unitId?:number;title:string;target:number;dueDate:string|null}):Promise<void>{
  const res=await fetch('/api/v1/production-plan?projectId='+projectId,{
    method:input.unitId?'PATCH':'POST',credentials:'include',
    headers:{'Content-Type':'application/json'},body:JSON.stringify(input)
  });
  if(!res.ok){
    const body=await res.json().catch(()=>({}));
    throw new Error(typeof body.error==='string'?body.error:'Ünite kaydedilemedi.');
  }
}
