import type { SavedBook } from './book-persistence-client';
export interface BookChapterDraft { key: string; title: string; questionIds: number[] }
export function draftChaptersFromBook(book: Pick<SavedBook,'chapters'>): BookChapterDraft[] {
  return [...book.chapters].sort((a,b)=>a.sortOrder-b.sortOrder).map(chapter=>({
    key:'saved-'+chapter.id,title:chapter.title,
    questionIds:[...chapter.questions].sort((a,b)=>a.sortOrder-b.sortOrder)
      .map(q=>q.snapshot.sourceQuestionId)
  }));
}
export function chapterQuestionIds(chapters: readonly BookChapterDraft[]): number[] {
  return chapters.flatMap(ch=>ch.questionIds);
}
export function bookStructureEquals(a:readonly Pick<BookChapterDraft,'title'|'questionIds'>[],b:readonly Pick<BookChapterDraft,'title'|'questionIds'>[]):boolean {
  return a.length===b.length&&a.every((ch,i)=>ch.title.trim()===b[i].title.trim()&&
    ch.questionIds.length===b[i].questionIds.length&&ch.questionIds.every((id,j)=>id===b[i].questionIds[j]));
}
export function bookStructureLabel(chapters:readonly Pick<BookChapterDraft,'title'|'questionIds'>[]):string {
  return chapters.map((ch,i)=>`${i+1}. ${ch.title} (${ch.questionIds.length} soru)`).join(' · ')||'Bölüm oluşturulmadı';
}
export function moveChapter(chapters:readonly BookChapterDraft[],key:string,direction:-1|1):BookChapterDraft[]{
  const index=chapters.findIndex(ch=>ch.key===key);const target=index+direction;
  if(index<0||target<0||target>=chapters.length)return [...chapters];
  const items=chapters.map(ch=>({...ch,questionIds:[...ch.questionIds]}));
  [items[index],items[target]]=[items[target],items[index]];
  return items;
}
export function assignQuestionToChapter(chapters:readonly BookChapterDraft[],id:number,key:string):BookChapterDraft[]{
  if(!chapters.some(ch=>ch.key===key)||!Number.isSafeInteger(id)||id<1)return [...chapters];
  return chapters.map(ch=>({
    ...ch,questionIds:ch.key===key
      ? ch.questionIds.includes(id)?[...ch.questionIds]:[...ch.questionIds,id]
      :ch.questionIds.filter(q=>q!==id)
  }));
}
export function moveQuestionInChapter(chapters:readonly BookChapterDraft[],key:string,id:number,direction:-1|1):BookChapterDraft[]{
  return chapters.map(ch=>{
    if(ch.key!==key)return {...ch,questionIds:[...ch.questionIds]};
    const i=ch.questionIds.indexOf(id),j=i+direction;
    if(i<0||j<0||j>=ch.questionIds.length)return {...ch,questionIds:[...ch.questionIds]};
    const next=[...ch.questionIds];[next[i],next[j]]=[next[j],next[i]];
    return {...ch,questionIds:next};
  });
}
