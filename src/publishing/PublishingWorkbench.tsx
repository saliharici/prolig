import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, BookOpen, Check, FileDown, Plus, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import type { ApiQuestion, QuestionAssetPlacement } from '../questions/types';
import type { ApiProject } from '../projects/types';
import { fetchProductionPlan, type ProductionPlan } from '../projects/production-plan-api';
import { StudioMarkup } from '../questions/StudioDocumentPreview';
import { approvedForPublishing, bookAnswer, bookMediaWarnings } from './book-assembly';
import { PublishingPersistencePanel } from './PublishingPersistencePanel';
import { frozenBookQuestions, publishingV2PreviewEnabled, type SavedBook } from './book-persistence-client';
import {
  assignQuestionToChapter, chapterQuestionIds, draftChaptersFromBook,
  moveChapter, moveQuestionInChapter, type BookChapterDraft
} from './book-editor-state';
import './publishing-production-v3.css';
import './publishing-v5.css';
import './publishing.css';

type Props = {
  questions: ApiQuestion[];
  projects: ApiProject[];
  loading: boolean;
  error: string;
  onRefresh: () => Promise<ApiQuestion[]>;
  initialProjectId?: number | null;
};

function safeImageSource(src: string | null | undefined): string | null {
  if (!src) return null;
  const value = src.trim();
  if (/^https?:\/\/[^\s]+$/i.test(value)) return value;
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return value;
  return null;
}

function BookImages({ question, placement }: { question: ApiQuestion; placement: QuestionAssetPlacement }) {
  const images = (question.assets || []).filter(asset =>
    asset.placement === placement && asset.assetType === 'IMAGE');
  const legacyImage = placement === 'STEM' && images.length === 0 && question.imageUrl
    ? [{ id: 'legacy', url: question.imageUrl, altText: 'Soru görseli', title: '' }] : [];
  return <>{[...images, ...legacyImage].map(image => {
    const url = safeImageSource(image.url);
    return url ? <figure key={image.id} className="publishing-image">
      <img src={url} alt={image.altText || image.title || 'Soruya ait görsel'} loading="eager" />
      {image.title && <figcaption>{image.title}</figcaption>}
    </figure> : <p key={image.id} className="publishing-image-warning">Bu görsel adresi baskıda gösterilemiyor; kaynağını kontrol edin.</p>;
  })}</>;
}

function QuestionForBook({ question, ordinal }: { question: ApiQuestion; ordinal: number }) {
  const type = question.questionType || 'MULTIPLE_CHOICE';
  return <article className="publishing-question" aria-label={'Soru ' + ordinal}>
    <div className="publishing-question-number">{ordinal}. Soru <span>{question.grade || 'Sınıf belirtilmedi'}</span></div>
    <StudioMarkup value={question.content} />
    <BookImages question={question} placement="STEM" />
    {type === 'MULTIPLE_CHOICE' && <ol className="publishing-choices" type="A">
      {(question.options || []).map((option, index) => {
        const letter = String.fromCharCode(65 + index);
        return <li key={letter}><StudioMarkup value={option} /><BookImages question={question} placement={('OPTION_' + letter) as QuestionAssetPlacement} /></li>;
      })}
    </ol>}
    {type === 'TRUE_FALSE' && <div className="publishing-true-false">□ Doğru　　□ Yanlış</div>}
    {type === 'OPEN_ENDED' && <div className="publishing-answer-lines" aria-label="Öğrenci cevap alanı"><i/><i/><i/></div>}
  </article>;
}

export function PublishingWorkbench({ questions, projects, loading, error, onRefresh, initialProjectId = null }: Props) {
  const [title,setTitle]=useState('Yeni Soru Kitabı');
  const [projectFilter,setProjectFilter]=useState(initialProjectId?String(initialProjectId):'all');
  const [search,setSearch]=useState('');
  const [columns,setColumns]=useState<1|2>(1);
  const [withAnswerKey,setWithAnswerKey]=useState(false);
  const [activeBook,setActiveBook]=useState<SavedBook|null>(null);
  const [chapters,setChapters]=useState<BookChapterDraft[]>([{key:'new-1',title:'Bölüm 1 · Sorular',questionIds:[]}]);
  const [activeKey,setActiveKey]=useState('new-1');
  const nextKey=useRef(2);
  const [plan,setPlan]=useState<ProductionPlan|null>(null);
  const [planLoading,setPlanLoading]=useState(false);
  const [planError,setPlanError]=useState('');
  const publishingPreview=publishingV2PreviewEnabled(import.meta.env as unknown as {
    VITE_PUBLISHING_V2_PREVIEW?:string;VITE_VERCEL_ENV?:string;
  });
  const selectedIds=useMemo(()=>chapterQuestionIds(chapters),[chapters]);
  const currentChapter=chapters.find(c=>c.key===activeKey)??chapters[0];
  const eligible=useMemo(()=>approvedForPublishing(questions),[questions]);
  const projectOptions=useMemo(()=>{
    const options=new Map<number,string>();
    if(activeBook?.project)options.set(activeBook.projectId,activeBook.project.code+' · '+activeBook.project.title);
    projects.filter(p=>p.status!=='Arsiv').forEach(p=>options.set(p.id,p.code+' · '+p.title));
    return [...options.entries()].sort((a,b)=>a[1].localeCompare(b[1],'tr-TR'));
  },[projects,activeBook]);
  const selectedProject=projectFilter==='all'?null:projects.find(p=>p.id===Number(projectFilter))??null;
  const eligibleInProject=selectedProject?eligible.filter(q=>q.projectId===selectedProject.id):[];
  const candidates=useMemo(()=>eligible.filter(q=>{
    if(projectFilter!=='all'&&q.projectId!==Number(projectFilter))return false;
    const query=search.trim().toLocaleLowerCase('tr-TR');
    return !query||(q.content+' '+(q.grade||'')+' '+(q.project?.code||'')).toLocaleLowerCase('tr-TR').includes(query);
  }),[eligible,projectFilter,search]);

  useEffect(()=>{
    const projectId=Number(projectFilter);
    if(!Number.isSafeInteger(projectId)||projectId<=0){setPlan(null);setPlanError('');return;}
    let live=true;
    setPlanLoading(true);
    void fetchProductionPlan(projectId).then(result=>{
      if(live){setPlan(result);setPlanError('');}
    }).catch(err=>{
      if(live){setPlan(null);setPlanError(err instanceof Error?err.message:'Bölüm planı yüklenemedi.');}
    }).finally(()=>{if(live)setPlanLoading(false);});
    return ()=>{live=false;};
  },[projectFilter]);

  function openSavedBook(book:SavedBook){
    const rows=draftChaptersFromBook(book);
    setActiveBook(book);
    setTitle(book.title);
    setChapters(rows);
    setActiveKey(rows[0]?.key??'new-1');
    setProjectFilter(String(book.projectId));
    setColumns(book.layoutColumns===2?2:1);
    setWithAnswerKey(false);
    setSearch('');
  }
  function startNewBook(){
    const key='new-'+nextKey.current++;
    setActiveBook(null);
    setTitle('Yeni Soru Kitabı');
    setChapters([{key,title:'Bölüm 1 · Sorular',questionIds:[]}]);
    setActiveKey(key);setProjectFilter('all');setColumns(1);setWithAnswerKey(false);setSearch('');
  }
  function addChapter(){
    if(chapters.length>=30)return;
    const key='new-'+nextKey.current++;
    setChapters(current=>[...current,{key,title:'Bölüm '+(current.length+1)+' · Yeni Ünite',questionIds:[]}]);
    setActiveKey(key);
  }
  function removeChapter(key:string){
    if(chapters.length<=1)return;
    const found=chapters.find(ch=>ch.key===key);
    if(found?.questionIds.length&&!window.confirm('Bu bölümdeki sorular kitap seçiminden çıkarılacak. Bölümü kaldırmak istiyor musunuz?'))return;
    const after=chapters.filter(ch=>ch.key!==key);
    setChapters(after);
    if(activeKey===key)setActiveKey(after[0].key);
  }
  function toggleQuestion(id:number){
    if(!currentChapter)return;
    const existing=chapters.find(ch=>ch.questionIds.includes(id));
    setChapters(current=>existing
      ?current.map(ch=>({...ch,questionIds:ch.questionIds.filter(q=>q!==id)}))
      :assignQuestionToChapter(current,id,currentChapter.key));
  }
  function buildChaptersFromPlan(){
    if(!plan?.units.length)return;
    if(selectedIds.length&&!window.confirm('Mevcut bölüm/soru seçimleri plan bölümleriyle değiştirilecek. Devam edilsin mi?'))return;
    const valid=new Set(eligibleInProject.map(q=>q.id));
    const byTask=new Map<number,number[]>();
    for(const question of eligibleInProject){
      if(question.taskId==null)continue;
      byTask.set(question.taskId,[...(byTask.get(question.taskId)??[]),question.id]);
    }
    const seen=new Set<number>();
    const next=plan.units.map(unit=>{
      const key='new-'+nextKey.current++;
      const questionIds=unit.tasks.flatMap(t=>byTask.get(t.id)??[]).filter(id=>{
        if(!valid.has(id)||seen.has(id))return false;
        seen.add(id);return true;
      });
      return {key,title:unit.title,questionIds};
    });
    setChapters(next);
    setActiveKey(next[0].key);
  }
  const snapshots=useMemo(()=>new Map((activeBook?frozenBookQuestions(activeBook):[]).map(q=>[q.id,q])),[activeBook]);
  const live=useMemo(()=>new Map(eligible.map(q=>[q.id,q])),[eligible]);
  const chaptersForPrint=useMemo(()=>chapters.map(ch=>({
    chapter:ch,questions:ch.questionIds.map(id=>snapshots.get(id)??live.get(id))
      .filter((q):q is ApiQuestion=>Boolean(q))
  })),[chapters,snapshots,live]);
  const bookQuestions=chaptersForPrint.flatMap(ch=>ch.questions);
  const warnings=bookMediaWarnings(bookQuestions);
  const printable=Boolean(bookQuestions.length&&title.trim()&&!loading&&!error);
  return <div className="publishing-workbench publishing-v5">
    <div className="page-heading publishing-heading">
      <div><div className="eyebrow">YAYINCILIK · V5 · ÇOK BÖLÜMLÜ KİTAP</div><h1>Profesyonel Kitap Atölyesi</h1>
        <p>Kitap bölümlerini oluşturun, onaylı soruları yerleştirin; kaydedilmiş Word belgesi veya PDF baskı önizlemesi hazırlayın.</p></div>
      <span className="heading-chip"><BookOpen size={16}/> TEST · Kitap Taslağı</span>
    </div>
    <p className="publishing-boundary" role="note">
      {publishingPreview
        ? 'Kalıcı kitap kaydı yalnız izole TEST Preview veritabanında etkindir. Word sadece kaydedilmiş sürümden hazırlanır. PDF, yazdırma penceresindeki “PDF olarak kaydet” seçeneğiyle alınır. ISBN, nihai matbaa dizgisi ve yayımlama onayı bu ekranda verilmez.'
        : 'Bu ortamda bölüm seçimi geçicidir; kitap API kayıtları kapalıdır. Yazdır → PDF olarak kaydet ile baskı taslağı alabilirsiniz.'}
    </p>
    {publishingPreview&&<PublishingPersistencePanel
      questions={questions} loading={loading} sourceError={error}
      view={{title,columns,projectFilter,chapters}}
      activeBook={activeBook} onOpen={openSavedBook} onNew={startNewBook}
    />}
    <div className="v5-book-setup">
      <label>Kitap adı<input maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></label>
      <label>Kitap projesi<select value={projectFilter} disabled={Boolean(activeBook)} onChange={e=>{
        const next=e.target.value;
        if(selectedIds.length&&!window.confirm('Proje değişikliği seçilen soruları temizleyecek. Devam edilsin mi?'))return;
        setProjectFilter(next);setChapters(chapters.map(ch=>({...ch,questionIds:[]})));
      }}>
        <option value="all">Proje seçin</option>
        {projectOptions.map(([id,name])=><option key={id} value={id}>{name}</option>)}
      </select></label>
      <label>Sayfa düzeni<select value={columns} onChange={e=>setColumns(e.target.value==='2'?2:1)}>
        <option value={1}>A4 · Tek sütun (Word + PDF)</option>
        <option value={2}>A4 · Çift sütun (PDF önizleme)</option>
      </select></label>
      <label className="publishing-check"><input type="checkbox" checked={withAnswerKey}
        onChange={e=>setWithAnswerKey(e.target.checked)}/> PDF önizlemesine cevap anahtarı ekle</label>
    </div>
    <section className="v5-chapter-editor" aria-label="Kitap bölüm ve ünite düzenleyici">
      <div className="v5-section-head"><div><h2>1. Bölümler ve Üniteler</h2>
        <p>Bölümleri sıralayın; her soruyu yalnız bir bölüme yerleştirin. Kaydedilmiş kitap yeniden açılıp düzenlenebilir.</p></div>
        <div className="v5-actions">
          <button type="button" className="secondary-button" onClick={addChapter} disabled={chapters.length>=30}><Plus size={14}/> Bölüm ekle</button>
          <button type="button" className="secondary-button" disabled={!plan?.units.length||planLoading}
            onClick={buildChaptersFromPlan}><BookOpen size={14}/> Ünite planından aktar</button>
        </div>
      </div>
      {planLoading&&<p role="status">Ünite üretim planı yükleniyor…</p>}
      {planError&&<p className="publishing-error" role="alert">{planError}</p>}
      {plan&&<p className="v5-plan-context">Ünite hedefi {plan.summary.totalTarget} · Onay {plan.summary.approved} · Eksik {plan.summary.missing}
        · {plan.summary.ready?'Üretim planı tamam':'Üretim eksikleri var'}; kitap taslağı eksik ünitelerle de kaydedilebilir.</p>}
      <div className="v5-chapter-tabs">
        {chapters.map((ch,i)=><div className={'v5-chapter-tab'+(ch.key===currentChapter?.key?' active':'')} key={ch.key}>
          <button type="button" className="v5-chapter-pick" onClick={()=>setActiveKey(ch.key)}>
            <span>{i+1}. {ch.title}</span><small>{ch.questionIds.length} soru</small></button>
          <div className="v5-chapter-actions">
            <button type="button" title="Bölümü yukarı taşı" disabled={i===0}
              onClick={()=>setChapters(prev=>moveChapter(prev,ch.key,-1))}><ArrowUp size={13}/></button>
            <button type="button" title="Bölümü aşağı taşı" disabled={i===chapters.length-1}
              onClick={()=>setChapters(prev=>moveChapter(prev,ch.key,1))}><ArrowDown size={13}/></button>
            <button type="button" title="Bölümü kaldır" disabled={chapters.length===1}
              onClick={()=>removeChapter(ch.key)}><Trash2 size={13}/></button>
          </div>
        </div>)}
      </div>
      {currentChapter&&<label className="v5-active-title">Seçili bölüm adı
        <input maxLength={120} value={currentChapter.title} onChange={e=>setChapters(prev=>prev.map(ch=>
          ch.key===currentChapter.key?{...ch,title:e.target.value}:ch))}/>
      </label>}
    </section>
    <div className="v5-book-editor-columns">
      <section className="panel v5-question-bank" aria-label="Onaylanan soru havuzu">
        <div className="v5-section-head"><div><h2>2. Onaylı Soruları Yerleştir</h2>
          <p>{currentChapter?.title} · {currentChapter?.questionIds.length??0} soru</p></div>
          <button type="button" className="secondary-button" disabled={loading} onClick={()=>void onRefresh()}><RefreshCw size={14}/> Yenile</button>
        </div>
        <label>Soru ara<input value={search} placeholder="Soru metni veya kazanım" onChange={e=>setSearch(e.target.value)}/></label>
        {loading&&<p role="status">Soru havuzu yükleniyor…</p>}
        {error&&<p role="alert" className="publishing-error">{error}</p>}
        {!loading&&!error&&candidates.length===0&&<p className="publishing-empty">Seçili projede onaylı, aktif soru bulunmuyor.</p>}
        <div className="v5-eligible-list">
          {candidates.map(q=>{
            const located=chapters.find(ch=>ch.questionIds.includes(q.id));
            return <button type="button" key={q.id} disabled={projectFilter==='all'||!currentChapter}
              className={'v5-eligible'+(located?' selected':'')} onClick={()=>toggleQuestion(q.id)}>
              <span><strong>#{q.id} · {q.grade||'Sınıf yok'} {located?'· '+located.title:''}</strong>
                <small>{q.content.slice(0,155)}</small></span>
              {located?<Check size={17}/>:<Plus size={16}/>}
            </button>
          })}
        </div>
        <p className="v5-help">Seçmek soruyu etkin bölüme ekler. Başka bölümdeki soruyu önce çıkartıp doğru bölüme ekleyebilirsiniz.</p>
      </section>
      <section className="panel v5-questions-order" aria-label="Bölüm içi soru sırası">
        <h2>3. Soru Sırası ve Bölümler Arası Taşıma</h2>
        <p>Kaydedilirken bölüm sırası ve soru sırası birlikte korunur.</p>
        {currentChapter?.questionIds.length===0&&<p className="publishing-empty">Bu bölüm boş; onaylı soruları ekleyin. Kaydetmek için her bölümde en az bir soru olmalıdır.</p>}
        <ol>{currentChapter?.questionIds.map((id,i)=>{
          const q=snapshots.get(id)??live.get(id);
          return <li key={id} className="v5-ordered-question">
            <div><strong>{i+1}. Soru · #{id}</strong>
              <small>{q?.content.slice(0,100)??'Kaynak soruya erişilemiyor'}</small></div>
            <div className="v5-ordered-actions">
              <button title="Sıra yukarı" type="button" disabled={i===0}
                onClick={()=>setChapters(prev=>moveQuestionInChapter(prev,currentChapter!.key,id,-1))}><ArrowUp size={13}/></button>
              <button title="Sıra aşağı" type="button" disabled={i===currentChapter!.questionIds.length-1}
                onClick={()=>setChapters(prev=>moveQuestionInChapter(prev,currentChapter!.key,id,1))}><ArrowDown size={13}/></button>
              <select aria-label={'Soru '+id+' bölümünü değiştir'} value={currentChapter!.key}
                onChange={e=>setChapters(prev=>assignQuestionToChapter(prev,id,e.target.value))}>
                {chapters.map(ch=><option key={ch.key} value={ch.key}>{ch.title}</option>)}
              </select>
              <button title="Kitaptan çıkar" type="button" onClick={()=>toggleQuestion(id)}><Trash2 size={13}/></button>
            </div>
          </li>;
        })}</ol>
      </section>
    </div>
    <div className="publishing-preview-toolbar">
      <div><h2>4. Kitap İçindekiler ve Baskı Önizlemesi</h2>
        <p>Kapak · İçindekiler · Bölümler · İsteğe bağlı cevap anahtarı · A4 sayfa numaraları.</p></div>
      <button type="button" className="primary-button" disabled={!printable} onClick={()=>window.print()}>
        <FileDown size={17}/> Yazdır / PDF Kaydet</button>
    </div>
    {warnings.map(warning=><p key={warning} className="publishing-warning" role="note">{warning}</p>)}
    {!bookQuestions.length&&<div className="panel publishing-empty">Önizleme için en az bir onaylı soru seçin.</div>}
    {bookQuestions.length>0&&<div className="publishing-page v5-print-book" aria-label="Çok bölümlü kitap baskı önizlemesi">
      <div className="publishing-cover"><small>PRO-LİG · YAYIN ÖNİZLEMESİ</small>
        <h2>{title.trim()||'Başlıksız Kitap'}</h2>
        <p>{chapters.length} bölüm · {bookQuestions.length} soru</p>
        <small>Öğrenci nüshası · A4 · {columns===2?'Çift sütun':'Tek sütun'}</small>
      </div>
      <nav className="v5-print-toc" aria-label="Kitap içindekiler">
        <h2>İçindekiler</h2>
        <ol>{chapters.map((ch,i)=><li key={ch.key}>
          <a href={'#v5-chapter-'+i}><span>{i+1}. {ch.title}</span><small>{ch.questionIds.length} soru</small></a>
        </li>)}</ol>
        <p className="v5-toc-help">PDF'de bölüm başlıkları görüntülenir; gerçek sayfa sayıları tarayıcının baskı motorunca belirlenir.</p>
      </nav>
      {chaptersForPrint.map(({chapter:ch,questions:rows},i)=><section id={'v5-chapter-'+i}
        className="v5-print-chapter" key={ch.key} aria-label={ch.title}>
        <h3 className="publishing-chapter-heading">{i+1}. {ch.title}</h3>
        <div className={columns===2?'publishing-page-body two-columns':'publishing-page-body'}>
          {rows.map((q,j)=><QuestionForBook key={q.id} question={q}
            ordinal={chapters.slice(0,i).reduce((n,c)=>n+c.questionIds.length,0)+j+1}/>)}
        </div>
      </section>)}
      {withAnswerKey&&<section className="publishing-key" aria-label="Cevap anahtarı">
        <h3>Cevap Anahtarı</h3><ol>{bookQuestions.map((q,i)=><li key={q.id}>
          <strong>{i+1}.</strong> <StudioMarkup value={bookAnswer(q)}/></li>)}</ol>
      </section>}
      <p className="publishing-footnote">PRO-LİG · Yayın taslağı · Baskı ve içerik kontrolü tamamlanmamıştır.</p>
    </div>}
    {bookQuestions.length>0&&<p className="publishing-selected-status" role="status">
      <Check size={15}/>{chapters.length} bölümde {bookQuestions.length} soru. PDF yazdırma önizlemesi hazır; Word için kitabı önce sunucuya kaydedin.</p>}
  </div>;
}
