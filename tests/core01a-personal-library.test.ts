import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const store = vi.hoisted(() => ({
  sets: [] as any[], items: [] as any[], next: 1,
  finance: [] as any[], books: [] as any[], publisherCopies: [] as any[],
  questions: [
    { id: 11, authorUserId: 1, projectId: null, status: 'TASLAK', content: 'Birinci soruda on iki artı beş kaçtır?', imageUrl: null, grade: '8. Sınıf', objectiveCode: 'M.8', difficulty: 'Kolay',
      questionType: 'MULTIPLE_CHOICE', options: ['15','17','19','20'],correctAnswer:'B',booleanAnswer:null,modelAnswer:null,
      explanation:null,scoringRubric:null,evaluationCriteria:null, assets:[],privateGeometryAssets:[],
      updatedAt:new Date('2026-10-25T12:00:00.000Z'),authorUser:{fullName:'Yazar 1'} },
    { id: 12, authorUserId: 1, projectId: null, status:'TASLAK', content:'Erzurum Türkiye sınırları içindedir, doğru mu?',
      imageUrl:null,grade:'8. Sınıf',objectiveCode:null,difficulty:'Kolay',
      questionType:'TRUE_FALSE',options:[],correctAnswer:null,booleanAnswer:true,modelAnswer:null,
      explanation:null,scoringRubric:null,evaluationCriteria:null,assets:[],privateGeometryAssets:[],
      updatedAt:new Date('2026-10-25T12:01:00.000Z'),authorUser:{fullName:'Yazar 1'} },
    { id: 13, authorUserId: 2, projectId:null,status:'TASLAK',content:'Başka yazarın gizli sorusu',
      imageUrl:null,grade:'8. Sınıf',objectiveCode:null,difficulty:null,questionType:'MULTIPLE_CHOICE',
      options:['A','B','C','D'],correctAnswer:'C',booleanAnswer:null,modelAnswer:null,
      explanation:null,scoringRubric:null,evaluationCriteria:null,assets:[],privateGeometryAssets:[],
      updatedAt:new Date('2026-10-25T12:02:00.000Z'),authorUser:{fullName:'Yazar 2'} }
  ] as any[]
}));
vi.mock('../api/v1/_lib/prisma.js', () => {
  const decorate=(set:any)=>({...set,items:store.items.filter(i=>i.setId===set.id).sort((a,b)=>a.sortOrder-b.sortOrder)});
  const fake:any={
    questionSet: {
      findMany: async ({where}:any)=>store.sets.filter(s=>s.ownerUserId===where.ownerUserId).map(decorate),
      findFirst: async ({where}:any)=>{const x=store.sets.find(s=>s.id===where.id&&s.ownerUserId===where.ownerUserId);return x?decorate(x):null},
      findUnique: async ({where}:any)=>{const x=store.sets.find(s=>s.id===where.id);return x?decorate(x):null},
      count: async ({where}:any)=>store.sets.filter(s=>s.ownerUserId===where.ownerUserId).length,
      create: async ({data}:any)=>{const s={id:store.next++,revision:1,title:data.title,ownerUserId:data.ownerUserId,
        createdAt:new Date(),updatedAt:new Date()};store.sets.push(s);return s},
      updateMany: async ({where,data}:any)=>{const s=store.sets.find(x=>x.id===where.id&&x.ownerUserId===where.ownerUserId&&x.revision===where.revision);
        if(!s)return {count:0};s.title=data.title;s.revision++;return {count:1};}
    },
    questionSetItem:{
      deleteMany:async ({where}:any)=>{store.items=store.items.filter(i=>i.setId!==where.setId);return {count:1}},
      createMany:async ({data}:any)=>{store.items.push(...data);return {count:data.length}}
    },
    question:{
      findMany:async ({where}:any)=>store.questions.filter(q=>where.id.in.includes(q.id)&&
        q.authorUserId===where.authorUserId&&q.projectId===null&&q.status==='TASLAK'),
      findFirst:async ({where}:any)=>store.questions.find(q=>q.id===where.id&&q.authorUserId===where.authorUserId&&q.projectId===null&&q.status==='TASLAK')||null,
      create:async ({data}:any)=>{const q={id:100+store.publisherCopies.length,...data};store.publisherCopies.push(q);return q}
    },
    projectAuthor:{findUnique:async ({where}:any)=>where.projectId_authorProfileId.projectId===21?{
      project:{branchId:3,targetGrade:'8. Sınıf'}
    }:null},
    activityLog:{create:async()=>({})},
    $transaction:async(fn:any)=>fn(fake)
  };
  return {prisma:fake};
});
vi.mock('../api/v1/_lib/question-archive.js',()=>({isQuestionArchived:async()=>false}));
import { handlePersonalQuestionSets, canUsePersonalQuestion, validPersonalQuestionIds } from '../api/v1/_lib/personal-question-sets';
import { buildQuestionReadScope, canWorkflowReview } from '../api/v1/_lib/question-access';

const yaz1={id:1,fullName:'Yazar 1',role:{code:'YAZAR'},AuthorProfile:{id:101,branchId:3}};
const yaz2={id:2,fullName:'Yazar 2',role:{code:'YAZAR'},AuthorProfile:{id:102,branchId:3}};
const editor={id:20,role:{code:'EDITOR'},AuthorProfile:null};
const gk={id:30,role:{code:'GENEL_KOORDINATOR'},AuthorProfile:null};

const invoke=async(action:string,method:string,actor:any,body:any={},id?:number,answers?:string)=>{
  const snap:{status:number;body:any;binary:Buffer|null;headers:Record<string,string>}={status:200,body:null,binary:null,headers:{}};
  const res={
    setHeader:(k:string,v:string)=>{snap.headers[k]=v;return res},
    status:(x:number)=>{snap.status=x;return res},
    json:(x:any)=>{snap.body=x;return res},
    send:(x:Buffer)=>{snap.binary=x;return res}
  } as unknown as VercelResponse;
  const req={method,query:{...(id?{id:String(id)}:{}),...(answers?{answers}:{})},body} as unknown as VercelRequest;
  await handlePersonalQuestionSets(req,res,actor,action);return snap;
};
function unzipStored(bytes:Buffer,name:string):string{
  let i=0;
  while(i+30<bytes.length&&bytes.readUInt32LE(i)===0x04034b50){
    const size=bytes.readUInt32LE(i+18),nameLength=bytes.readUInt16LE(i+26),extra=bytes.readUInt16LE(i+28);
    const fileName=bytes.toString('utf8',i+30,i+30+nameLength);
    const bodyStart=i+30+nameLength+extra;
    if(fileName===name)return bytes.toString('utf8',bodyStart,bodyStart+size);
    i=bodyStart+size;
  }
  throw Error('DOCX XML entry missing: '+name);
}
beforeEach(()=>{store.sets=[];store.items=[];store.next=1;store.publisherCopies=[];store.finance=[];store.books=[];});
describe('CORE-01A only – personal storage, access, editable Word and no royalty',()=>{
  it('hides project-less questions from GK/editor/coordinators and keeps owner scope',()=>{
    expect(buildQuestionReadScope(gk)).toEqual({projectId:{not:null}});
    for(const role of ['EDITOR','IL_KOORDINATORU','BOLGE_KOORDINATORU']){
      const scope=buildQuestionReadScope({role:{code:role},id:20,assignedRegion:'Doğu Anadolu',provinceId:1,
        editorBranchId:3,branchAssignments:[{branchId:3}]});
      expect(scope.projectId).toEqual({not:null});
    }
    expect(buildQuestionReadScope(yaz1)).toEqual({authorUserId:1});
    expect(canUsePersonalQuestion(store.questions[0],1)).toBe(true);
    expect(canUsePersonalQuestion(store.questions[0],2)).toBe(false);
    expect(canWorkflowReview(store.questions[0],gk)).toBe(false);
    expect(validPersonalQuestionIds([11,12])).toEqual([11,12]);
    expect(()=>validPersonalQuestionIds([11,11])).toThrow();
  });
  it('persists, reopens, reorders and revises 2 questions without a Book or money record',async()=>{
    let x=await invoke('personalQuestionSets','POST',yaz1,{title:'Haftalık Alıştırmalar',questionIds:[12,11],expectedRevision:null});
    expect(x.status).toBe(201);expect(x.body.set.questionIds).toEqual([12,11]);
    const id=x.body.set.id;
    x=await invoke('personalQuestionSet','GET',yaz1,{},id);
    expect(x.status).toBe(200);expect(x.body.set.questionIds).toEqual([12,11]);
    x=await invoke('personalQuestionSet','PATCH',yaz1,{title:'Düzenlenmiş Set',questionIds:[11,12],expectedRevision:1},id);
    expect(x.status).toBe(200);expect(x.body.set.revision).toBe(2);expect(x.body.set.questionIds).toEqual([11,12]);
    x=await invoke('personalQuestionSets','GET',yaz1);
    expect(x.body.sets[0].title).toBe('Düzenlenmiş Set');
    expect(store.books).toHaveLength(0);expect(store.finance).toHaveLength(0);
  });
  it('rejects guessed cross-author IDs and EDITOR / GK list access',async()=>{
    const make=await invoke('personalQuestionSets','POST',yaz1,{title:'Özel Set',questionIds:[11]});
    const id=make.body.set.id;
    expect((await invoke('personalQuestionSet','GET',yaz2,{},id)).status).toBe(404);
    expect((await invoke('personalQuestionSetDocx','GET',yaz2,{},id,'1')).status).toBe(404);
    expect((await invoke('personalQuestionSets','GET',editor)).status).toBe(403);
    expect((await invoke('personalQuestionSets','GET',gk)).status).toBe(403);
    expect((await invoke('personalQuestionSets','POST',yaz1,{title:'Hatalı Karışık',questionIds:[11,13]})).status).toBe(404);
  });
  it('produces a real DOCX with ordered MCQ+TRUE_FALSE student sheet and teacher answer key',async()=>{
    const made=await invoke('personalQuestionSets','POST',yaz1,{title:'Gerçek Word Seti',questionIds:[11,12]});
    const id=made.body.set.id;
    const student=await invoke('personalQuestionSetDocx','GET',yaz1,{},id,'0');
    const teacher=await invoke('personalQuestionSetDocx','GET',yaz1,{},id,'1');
    expect(student.status).toBe(200);expect(teacher.status).toBe(200);
    for(const row of [student,teacher]){
      expect(row.headers['Content-Type']).toContain('wordprocessingml');
      expect(row.binary?.readUInt32LE(0)).toBe(0x04034b50);
    }
    const sx=unzipStored(student.binary!,'word/document.xml');
    const tx=unzipStored(teacher.binary!,'word/document.xml');
    expect(sx.indexOf('Birinci soruda')).toBeLessThan(sx.indexOf('Erzurum Türkiye'));
    expect(sx).not.toContain('Cevap Anahtarı');
    expect(tx).toContain('Cevap Anahtarı');
    expect(tx).toContain('1. B');expect(tx).toContain('2. Doğru');
    expect(tx).toContain('KİŞİSEL SORU KÜTÜPHANESİ');
    expect(store.books).toHaveLength(0);expect(store.finance).toHaveLength(0);
  });
  it('makes publisher submission an explicit authorized COPY, never silently approves or accrues royalties',async()=>{
    const forbidden=await invoke('personalQuestionPublishCopy','POST',yaz1,{projectId:99},11);
    expect(forbidden.status).toBe(403);
    const own=await invoke('personalQuestionPublishCopy','POST',yaz1,{projectId:21},11);
    expect(own.status).toBe(201);expect(own.body.submittedForReview).toBe(false);
    expect(own.body.royaltiesAccrued).toBe(false);
    expect(store.questions[0].projectId).toBeNull();
    expect(store.questions[0].status).toBe('TASLAK');
    expect(store.publisherCopies[0].projectId).toBe(21);
    expect(store.publisherCopies[0].status).toBe('TASLAK');
    expect(store.finance).toHaveLength(0);
  });
});
