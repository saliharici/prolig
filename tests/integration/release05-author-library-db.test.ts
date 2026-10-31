import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { prisma } from '../../api/v1/_lib/prisma.js';
import questionsHandler from '../../api/v1/questions/index.js';
import questionHandler from '../../api/v1/questions/[id].js';
import workflowHandler from '../../api/v1/questions/[id]/workflow.js';

const url = (() => { try { return new URL(process.env.DATABASE_URL || ''); } catch { return null; } })();
if (process.env.PROLIG_P2_CI_ISOLATED_DB !== 'true' || !url ||
    !['127.0.0.1','localhost'].includes(url.hostname) ||
    url.port !== '5432' || url.pathname !== '/prolig_p2_ci') {
  throw new Error('RELEASE05_LOCAL_EPHEMERAL_PG_ONLY');
}
type Reply = { statusCode: number; data: any; headers: Record<string,string>; status: (code:number)=>Reply;
  json: (value:any)=>Reply; send: (value:any)=>Reply; setHeader: (k:string,v:string)=>void };
const reply = (): Reply => ({
  statusCode: 200, data: null, headers: {},
  status(code) {this.statusCode=code;return this;},
  json(value) {this.data=value;return this;},
  send(value) {this.data=value;return this;},
  setHeader(k,v) {this.headers[k]=v;}
});
let author1=0,author2=0,editor=0,general=0;
function req(method:string,body:any,actor:number,extra:Record<string,unknown>={}) {
  return {method,body,query:extra,
    headers:{cookie:serialize('prolig_session',
      jwt.sign({sub:String(actor)},process.env.AUTH_SECRET!,{algorithm:'HS256'}))}
  } as any;
}
async function call(method:string,body:any,actor:number,extra:Record<string,unknown>={}) {
  const res=reply();await questionsHandler(req(method,body,actor,extra),res as any);return res;
}
const simple=(content:string,isPersonal:boolean,subject='Matematik',topic='Rasyonel Sayılar')=>({
  content,grade:'7. Sınıf',options:['1','2','3','4'],correctAnswer:'B',
  projectId:null,isPersonal,
  ...(isPersonal?{personalSubject:subject,personalTopic:topic}:{})
});

describe('RELEASE-05 owner-only private questions / ordered sets / editable DOCX (real ephemeral DB)',()=>{
  beforeAll(async()=>{
    const writer=await prisma.role.upsert({where:{code:'YAZAR'},
      create:{code:'YAZAR',name:'Writer'},update:{}});
    const review=await prisma.role.upsert({where:{code:'EDITOR'},
      create:{code:'EDITOR',name:'Editor'},update:{}});
    const admin=await prisma.role.upsert({where:{code:'GENEL_KOORDINATOR'},
      create:{code:'GENEL_KOORDINATOR',name:'General'},update:{}});
    const province=await prisma.province.findFirst() ??
      await prisma.province.create({data:{code:'98',name:'Release 05 CI',region:'CI'}});
    const branch=await prisma.branch.create({data:{name:'Release05 Matematik',category:'CI'}});
    const first=await prisma.user.create({data:{
      username:'release05-author-one',email:'release05-1@invalid.example',
      fullName:'Release 05 Author One',roleId:writer.id,status:'Aktif'
    }});
    const second=await prisma.user.create({data:{
      username:'release05-author-two',email:'release05-2@invalid.example',
      fullName:'Release 05 Author Two',roleId:writer.id,status:'Aktif'
    }});
    const e=await prisma.user.create({data:{
      username:'release05-editor',email:'release05-editor@invalid.example',
      fullName:'Release 05 Editor',roleId:review.id,status:'Aktif',provinceId:province.id,
      editorBranchId:branch.id,editorGrade:'7. Sınıf'
    }});
    const a=await prisma.user.create({data:{
      username:'release05-admin',email:'release05-admin@invalid.example',
      fullName:'Release 05 General',roleId:admin.id,status:'Aktif'
    }});
    author1=first.id;author2=second.id;editor=e.id;general=a.id;
    await prisma.authorProfile.createMany({data:[
      {userId:author1,provinceId:province.id,branchId:branch.id},
      {userId:author2,provinceId:province.id,branchId:branch.id}
    ]});
  });
  afterAll(async()=>{await prisma.$disconnect();});

  it('does not relabel historic projectId=NULL records; only explicit private rows enter private library',async()=>{
    const historic=await prisma.question.create({data:{
      authorUserId:author1,content:'Historical publisher pool question no project',
      grade:'7. Sınıf',options:['A','B','C','D'],correctAnswer:'A',projectId:null
    }});
    expect(historic.isPersonal).toBe(false);
    const created=await call('POST',simple('İki tam sayının toplamını bulunuz.',true),author1);
    expect(created.statusCode,JSON.stringify(created.data)).toBe(201);
    expect(created.data.isPersonal).toBe(true);
    expect(created.data.status).toBe('TASLAK');
    expect(created.data.projectId).toBeNull();
    const privateId=created.data.id;
    const normal=await call('GET',undefined,author1);
    expect(normal.statusCode).toBe(200);
    expect(normal.data.some((q:any)=>q.id===historic.id)).toBe(true);
    expect(normal.data.some((q:any)=>q.id===privateId)).toBe(false);
    const own=await call('GET',undefined,author1,{library:'personal'});
    expect(own.statusCode).toBe(200);
    expect(own.data.some((q:any)=>q.id===privateId)).toBe(true);
    expect(own.data.some((q:any)=>q.id===historic.id)).toBe(false);
    for(const id of [author2,editor,general]){
      const other=await call('GET',undefined,id,id===author2?{library:'personal'}:{});
      expect(other.statusCode).toBe(id===author2?200:200);
      expect(other.data.some((q:any)=>q.id===privateId)).toBe(false);
    }
    const invalid=await call('POST',{...simple('Invalid private question with project',true),projectId:1},author1);
    expect(invalid.statusCode).toBe(400);
    const invalidScope=await call('POST',{...simple('Wrong private boolean flag',false),isPersonal:'true'},author1);
    expect(invalidScope.statusCode).toBe(400);
  });

  it('reopens, edits and prevents other-user writes or publisher workflow/royalties',async()=>{
    const create=await call('POST',simple('Soru metni kaydedilip yeniden açılabilmelidir.',true),author1);
    expect(create.statusCode,JSON.stringify(create.data)).toBe(201);
    const id=create.data.id;
    const reopened=(await call('GET',undefined,author1,{library:'personal'})).data.find((q:any)=>q.id===id);
    expect(reopened).toBeTruthy();
    const forbidden=reply();
    await questionHandler(req('PATCH',{content:'Other author malicious edit',expectedUpdatedAt:reopened.updatedAt},author2,{id:String(id)}),forbidden as any);
    expect(forbidden.statusCode).toBe(403);
    const edit=reply();
    await questionHandler(req('PATCH',{
      content:'Kayıtlı kişisel soru başarıyla yeniden düzenlendi.',
      personalTopic:'Tam Sayılar',expectedUpdatedAt:new Date(reopened.updatedAt).toISOString()
    },author1,{id:String(id)}),edit as any);
    expect(edit.statusCode,JSON.stringify(edit.data)).toBe(200);
    expect(edit.data.personalTopic).toBe('Tam Sayılar');
    const before=await prisma.compensationEntry.count();
    const workflow=reply();
    await workflowHandler(req('POST',{action:'submit'},author1,{id:String(id)}),workflow as any);
    expect(workflow.statusCode).toBe(409);
    const approve=reply();
    await workflowHandler(req('POST',{action:'approve'},general,{id:String(id)}),approve as any);
    expect(approve.statusCode).toBe(409);
    const persisted=await prisma.question.findUniqueOrThrow({where:{id}});
    expect(persisted.status).toBe('TASLAK');
    expect(persisted.isPersonal).toBe(true);
    expect(await prisma.compensationEntry.count()).toBe(before);
  });

  it('creates owner-only sets, reorders them, rejects cross-user IDs and produces DOCX with optional answer key',async()=>{
    const a=await call('POST',simple('İlk kişisel soru: x² işlemini hesaplayınız.',true),author1);
    const b=await call('POST',simple('İkinci kişisel soru: bir bölü iki kaçtır?',true),author1);
    const other=await call('POST',simple('Diğer yazarın sorusu gizli kalmalıdır.',true),author2);
    expect(a.statusCode).toBe(201); expect(b.statusCode).toBe(201);expect(other.statusCode).toBe(201);

    const forbidden=await call('POST',{action:'createPersonalSet',title:'Yabancı sorulu set',
      questionIds:[a.data.id,other.data.id]},author1);
    expect(forbidden.statusCode).toBe(403);
    const duplicate=await call('POST',{action:'createPersonalSet',title:'Tekrarlı set',
      questionIds:[a.data.id,a.data.id]},author1);
    expect(duplicate.statusCode).toBe(400);
    const created=await call('POST',{action:'createPersonalSet',title:'Rasyonel Sayılar Alıştırmaları',
      questionIds:[a.data.id,b.data.id]},author1);
    expect(created.statusCode,JSON.stringify(created.data)).toBe(201);
    const setId=created.data.id;
    const listing=await call('POST',{action:'listPersonalSets'},author1);
    expect(listing.data.find((s:any)=>s.id===setId).questionIds).toEqual([a.data.id,b.data.id]);
    const otherList=await call('POST',{action:'listPersonalSets'},author2);
    expect(otherList.data.some((s:any)=>s.id===setId)).toBe(false);

    const modified=await call('POST',{action:'updatePersonalSet',title:'Sıralı Çalışma',
      setId,questionIds:[b.data.id,a.data.id]},author1);
    expect(modified.statusCode,JSON.stringify(modified.data)).toBe(200);
    expect(modified.data.questionIds).toEqual([b.data.id,a.data.id]);

    const foreignExport=await call('POST',{action:'exportPersonalSet',setId,includeAnswers:true},author2);
    expect(foreignExport.statusCode).toBe(404);
    const exportWith=await call('POST',{action:'exportPersonalSet',setId,includeAnswers:true},author1);
    expect(exportWith.statusCode,JSON.stringify(exportWith.data)).toBe(200);
    expect(exportWith.headers['Content-Type']).toContain('wordprocessingml.document');
    expect(Buffer.isBuffer(exportWith.data)).toBe(true);
    const xml=exportWith.data.toString('utf8');
    expect(xml).toContain('Cevap Anahtarı');
    expect(xml).toContain('1. Soru');
    expect(xml).toContain('2. Soru');
    expect(xml.indexOf('İkinci kişisel soru')).toBeLessThan(xml.indexOf('İlk kişisel soru'));

    const exportWithout=await call('POST',{action:'exportPersonalSet',setId,includeAnswers:false},author1);
    expect(exportWithout.statusCode).toBe(200);
    expect(exportWithout.data.toString('utf8')).not.toContain('Cevap Anahtarı');
    expect((await prisma.question.findUniqueOrThrow({where:{id:a.data.id}})).status).toBe('TASLAK');
    expect(await prisma.compensationEntry.count({where:{questionId:{in:[a.data.id,b.data.id]}}})).toBe(0);
  });
});
