import { describe,expect,it } from 'vitest';
import {
  assignQuestionToChapter,bookStructureEquals,bookStructureLabel,chapterQuestionIds,
  draftChaptersFromBook,moveChapter,moveQuestionInChapter,type BookChapterDraft
} from '../src/publishing/book-editor-state';
import { prepareBookSave,PublishingApiError } from '../src/publishing/book-persistence-client';
import type { ApiQuestion } from '../src/questions/types';

const rows:BookChapterDraft[]=[
  {key:'a',title:'Tam Sayılar',questionIds:[11,12]},
  {key:'b',title:'Rasyonel Sayılar',questionIds:[13]}
];
const question=(id:number,projectId=7):ApiQuestion=>({
  id,content:'Deneme için soru metni '+id,grade:'7. Sınıf',
  imageUrl:null,assets:[],objectiveCode:null,difficulty:null,
  options:['A','B','C','D'],correctAnswer:'A',explanation:null,
  status:'ONAYLANDI',editorNote:null,projectId,taskId:null,
  questionType:'MULTIPLE_CHOICE',optionCount:4,
  createdAt:'2026-10-29T00:00:00.000Z',updatedAt:'2026-10-29T00:00:00.000Z',
  isArchived:false,project:{id:projectId,code:'TEST',title:'TEST'},
  author:{id:1,fullName:'TEST Yazar'}
});
describe('V5 çok bölümlü kitap editörünün saf iş kuralları',()=>{
  it('bölümleri ters çevirir ve soru yerini korur',()=>{
    const reordered=moveChapter(rows,'b',-1);
    expect(reordered.map(ch=>ch.key)).toEqual(['b','a']);
    expect(chapterQuestionIds(reordered)).toEqual([13,11,12]);
    expect(rows[0].questionIds).toEqual([11,12]);
  });
  it('soruyu diğer bölüme taşırken çoğaltmaz',()=>{
    const moved=assignQuestionToChapter(rows,12,'b');
    expect(moved[0].questionIds).toEqual([11]);
    expect(moved[1].questionIds).toEqual([13,12]);
    expect(moveQuestionInChapter(moved,'b',12,-1)[1].questionIds).toEqual([12,13]);
  });
  it('kaydedilmiş bölüm/soru sırasını tekrar kurar',()=>{
    const saved={chapters:rows.map((row,i)=>({
      id:i+1,title:row.title,sortOrder:i,
      questions:row.questionIds.map((id,index)=>({
        snapshot:{sourceQuestionId:id},sortOrder:index
      }))
    }))} as unknown as Parameters<typeof draftChaptersFromBook>[0];
    const restored=draftChaptersFromBook(saved);
    expect(bookStructureEquals(restored,rows)).toBe(true);
    expect(bookStructureLabel(restored)).toContain('Rasyonel Sayılar');
  });
  it('bir soru iki bölümdeyse kayıt engellenir',()=>{
    expect(()=>prepareBookSave({
      title:'Matematik Kitabı',projectFilter:'7',columns:1,
      chapters:[{title:'Ünite 1',questionIds:[11]},{title:'Ünite 2',questionIds:[11]}]
    },[question(11)],null)).toThrow(PublishingApiError);
  });
  it('iki ayrı bölümün onaylı sorularını sıra ile kayda hazırlar',()=>{
    const result=prepareBookSave({
      title:'Matematik Kitabı',projectFilter:'7',columns:1,
      chapters:rows.map(ch=>({title:ch.title,questionIds:ch.questionIds}))
    },[question(11),question(12),question(13)],null);
    expect(result.chapters).toEqual([
      {title:'Tam Sayılar',questionIds:[11,12]},
      {title:'Rasyonel Sayılar',questionIds:[13]}
    ]);
    expect(result.expectedRevision).toBeNull();
  });
  it('arşivlenmiş soru kitap içeriğine eklenmez',()=>{
    expect(()=>prepareBookSave({
      title:'Matematik Kitabı',projectFilter:'7',columns:1,
      chapters:[{title:'Ünite 1',questionIds:[11]}]
    },[{...question(11),isArchived:true}],null)).toThrow(PublishingApiError);
  });
});
