import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from './_lib/prisma.js';
import { getCurrentUser } from './_lib/current-user.js';
import { buildProjectReadScope, canManageProject } from './_lib/project-access.js';
import { projectSelect } from './_lib/project-dto.js';

function id(value: unknown): number | null {
  const num = typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : value;
  return typeof num === 'number' && Number.isSafeInteger(num) && num > 0 ? num : null;
}
function target(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 && value <= 10000 ? value : null;
}
function due(value: unknown): Date | null | undefined {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(value + 'T00:00:00.000Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10) === value ? date : undefined;
}
const include = {
  tasks: {
    select: {
      id:true,title:true,status:true,dueDate:true,targetQuestionCount:true,
      assignedAuthorProfile:{select:{user:{select:{fullName:true}}}},
      questions:{select:{id:true,status:true}}
    }
  }
} as const;
function dto(row: any, archivedIds: ReadonlySet<number>) {
  const tasks = row.tasks.map((t: any) => ({
    id:t.id,title:t.title,status:t.status,dueDate:t.dueDate,
    writer:t.assignedAuthorProfile?.user.fullName ?? null,
    target:t.targetQuestionCount,written:t.questions.length,
    approved:t.questions.filter((q:any)=>q.status==='ONAYLANDI' && !archivedIds.has(q.id)).length,
    inReview:t.questions.filter((q:any)=>q.status==='INCELEMEDE').length,
    revision:t.questions.filter((q:any)=>q.status==='REVIZYON').length
  }));
  const sum = (field: 'target'|'written'|'approved'|'inReview'|'revision') =>
    tasks.reduce((acc:number, task:any)=>acc+task[field],0);
  const assigned=sum('target'), approved=sum('approved');
  const missing=Math.max(0,row.targetQuestionCount-approved);
  const today=new Date();today.setUTCHours(0,0,0,0);
  return {
    id:row.id,projectId:row.projectId,title:row.title,sortOrder:row.sortOrder,
    target:row.targetQuestionCount,dueDate:row.dueDate,
    assigned,allocationGap:Math.max(0,row.targetQuestionCount-assigned),
    overAllocated:Math.max(0,assigned-row.targetQuestionCount),
    written:sum('written'),approved,inReview:sum('inReview'),revision:sum('revision'),
    missing,completionPercent:Math.min(100,Math.round(approved*100/row.targetQuestionCount)),
    overdue:!!row.dueDate && row.dueDate<today && missing>0,tasks
  };
}
export default async function handler(req: VercelRequest,res: VercelResponse) {
  res.setHeader('Cache-Control','no-store');
  if (!['GET','POST','PATCH'].includes(req.method??'')) return res.status(405).json({error:'Method not allowed'});
  try {
    const user=await getCurrentUser(req);
    if(!user) return res.status(401).json({error:'Unauthorized'});
    if(!['GENEL_KOORDINATOR','BOLGE_KOORDINATORU','BRANS_KOORDINATORU'].includes(user.role.code))
      return res.status(403).json({error:'Üretim planı koordinatörlere açıktır.'});
    const projectId=id(req.query.projectId),scope=buildProjectReadScope(user);
    if(!projectId || scope===null) return res.status(400).json({error:'Proje seçimi geçersiz.'});
    const project=await prisma.project.findFirst({where:{AND:[{id:projectId},scope]},select:projectSelect});
    if(!project) return res.status(404).json({error:'Bu kapsamda proje bulunamadı.'});
    const canManage=canManageProject(user,project);
    if(req.method==='GET') {
      const rows=await prisma.projectUnitPlan.findMany({
        where:{projectId},include,orderBy:[{sortOrder:'asc'},{id:'asc'}]
      });
      const questionIds=rows.flatMap(unit=>unit.tasks.flatMap(task=>task.questions.map(q=>q.id)));
      const archiveLogs=questionIds.length ? await prisma.activityLog.findMany({
        where:{entityType:'Question',entityId:{in:questionIds},
          action:{in:['QUESTION_ARCHIVED','QUESTION_RESTORED']}},
        orderBy:[{createdAt:'desc'},{id:'desc'}],
        select:{entityId:true,action:true}
      }) : [];
      const lastArchiveState=new Map<number,boolean>();
      for(const log of archiveLogs){
        if(log.entityId!=null && !lastArchiveState.has(log.entityId))
          lastArchiveState.set(log.entityId,log.action==='QUESTION_ARCHIVED');
      }
      const archivedIds=new Set([...lastArchiveState.entries()].filter(([,v])=>v).map(([id])=>id));
      const units=rows.map(row=>dto(row,archivedIds));
      const unallocatedTasks=await prisma.task.count({
        where:{projectId,unitPlanId:null,assignedAuthorProfileId:{not:null},targetQuestionCount:{gt:0}}
      });
      const totalTarget=units.reduce((n,u)=>n+u.target,0);
      const approved=units.reduce((n,u)=>n+u.approved,0);
      return res.status(200).json({projectId,canManage,units,summary:{
        totalTarget,approved,missing:Math.max(0,totalTarget-approved),
        overdueUnits:units.filter(u=>u.overdue).length,unallocatedTasks,
        ready:units.length>0 && units.every(u=>u.missing===0 && u.allocationGap===0) && unallocatedTasks===0
      }});
    }
    if(!canManage) return res.status(403).json({error:'Ünite planı düzenleme yetkisi yok.'});
    if(['Arsiv','Tamamlandi'].includes(project.status))
      return res.status(409).json({error:'Kapalı projeye üretim planı eklenemez.'});
    const body=req.body && typeof req.body==='object' && !Array.isArray(req.body) ? req.body : {};
    const fields=req.method==='POST'?['title','target','dueDate']:['unitId','title','target','dueDate'];
    if(Object.keys(body).some(k=>!fields.includes(k)))
      return res.status(400).json({error:'Desteklenmeyen alan.'});
    const title=typeof body.title==='string'?body.title.trim():'';
    const quantity=target(body.target),dueDate=due(body.dueDate ?? null);
    if(title.length<3 || title.length>120 || quantity===null || dueDate===undefined)
      return res.status(400).json({error:'Ünite adı 3–120 karakter; hedef 1–10000; tarih YYYY-MM-DD olmalıdır.'});
    if(req.method==='POST') {
      const count=await prisma.projectUnitPlan.count({where:{projectId}});
      if(count>=30) return res.status(409).json({error:'En fazla 30 ünite/bölüm planlanabilir.'});
      const max=await prisma.projectUnitPlan.aggregate({where:{projectId},_max:{sortOrder:true}});
      const unit=await prisma.$transaction(async tx=>{
        const created=await tx.projectUnitPlan.create({data:{
          projectId,title,targetQuestionCount:quantity,dueDate,sortOrder:(max._max.sortOrder??-1)+1
        }});
        await tx.activityLog.create({data:{
          userName:user.fullName,action:'PROJECT_UNIT_CREATED',entityType:'Project',entityId:projectId,
          details:JSON.stringify({unitId:created.id,title,target:quantity})
        }});
        return created;
      });
      return res.status(201).json({unitId:unit.id});
    }
    const unitId=id(body.unitId);
    if(!unitId) return res.status(400).json({error:'Ünite seçilmedi.'});
    if(!(await prisma.projectUnitPlan.findFirst({where:{id:unitId,projectId}})))
      return res.status(404).json({error:'Ünite bulunamadı.'});
    await prisma.$transaction(async tx=>{
      await tx.projectUnitPlan.update({where:{id:unitId},data:{title,targetQuestionCount:quantity,dueDate}});
      await tx.activityLog.create({data:{
        userName:user.fullName,action:'PROJECT_UNIT_UPDATED',entityType:'Project',entityId:projectId,
        details:JSON.stringify({unitId,title,target:quantity})
      }});
    });
    return res.status(200).json({unitId});
  }catch(error:any){
    if(error?.code==='P2002') return res.status(409).json({error:'Ünite adı zaten var veya sıralama çakıştı.'});
    console.error('Unit plan failure',error);
    return res.status(500).json({error:'Üretim planı işlenemedi.'});
  }
}
