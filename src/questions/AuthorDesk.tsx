import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, BookMarked, Check, Download, FilePlus2, FolderPlus, PencilLine, Plus, RefreshCw, Save, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import type { ApiQuestion, CreateQuestionInput, PatchQuestionInput } from './types';
import { createQuestion, patchQuestion } from './api';
import { QuestionStemWysiwygEditor } from './QuestionStemWysiwygEditor';
import { QuestionTypePreview } from './QuestionTypePreview';
import { deletePersonalSet, downloadPersonalSet, fetchPersonalQuestions, fetchPersonalSets, savePersonalSet, type PersonalQuestionSet } from './personal-library-api';
import './author-desk.css';

type Kind = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'OPEN_ENDED';
type Draft = {
  id: number | null; expectedUpdatedAt: string | null; content: string; grade: string;
  personalSubject: string; personalTopic: string; questionType: Kind;
  optionCount: 4 | 5; options: string[]; correctAnswer: string;
  booleanAnswer: boolean; modelAnswer: string; explanation: string; difficulty: string;
};
const emptyDraft = (): Draft => ({
  id: null, expectedUpdatedAt: null, content: '', grade: '8. Sınıf',
  personalSubject: '', personalTopic: '', questionType: 'MULTIPLE_CHOICE',
  optionCount: 4, options: ['', '', '', '', ''], correctAnswer: 'A',
  booleanAnswer: true, modelAnswer: '', explanation: '', difficulty: ''
});
function formFromQuestion(q: ApiQuestion): Draft {
  return {
    id: q.id, expectedUpdatedAt: q.updatedAt, content: q.content, grade: q.grade || '8. Sınıf',
    personalSubject: q.personalSubject || '', personalTopic: q.personalTopic || '',
    questionType: q.questionType || 'MULTIPLE_CHOICE',
    optionCount: q.optionCount === 5 ? 5 : 4,
    options: [...(q.options || []), '', '', '', '', ''].slice(0, 5),
    correctAnswer: q.correctAnswer || 'A', booleanAnswer: q.booleanAnswer ?? true,
    modelAnswer: q.modelAnswer || '', explanation: q.explanation || '', difficulty: q.difficulty || ''
  };
}
const grades = Array.from({length: 12}, (_, i) => `${i + 1}. Sınıf`).concat('Mezun');
const typeNames: Record<Kind, string> = {
  MULTIPLE_CHOICE: 'Çoktan Seçmeli', TRUE_FALSE: 'Doğru / Yanlış', OPEN_ENDED: 'Açık Uçlu'
};

export function AuthorDesk({ onPublisher }: { onPublisher: () => void }) {
  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [sets, setSets] = useState<PersonalQuestionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [query, setQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [setId, setSetId] = useState<number | null>(null);
  const [setTitle, setSetTitle] = useState('');
  const [includeAnswers, setIncludeAnswers] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [q, s] = await Promise.all([fetchPersonalQuestions(), fetchPersonalSets()]);
      setQuestions(q);
      setSets(s);
      const ids = new Set(q.map(item => item.id));
      setSelectedIds(old => old.filter(id => ids.has(id)));
    } catch (e: any) { setError(e.message || 'Kişisel kütüphane yüklenemedi.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const subjects = useMemo(() => [...new Set(questions.map(q => q.personalSubject).filter((s): s is string => !!s))].sort(), [questions]);
  const topics = useMemo(() => [...new Set(questions.filter(q => !subjectFilter || q.personalSubject === subjectFilter)
    .map(q => q.personalTopic).filter((s): s is string => !!s))].sort(), [questions, subjectFilter]);
  const visible = useMemo(() => questions.filter(q =>
    (!gradeFilter || q.grade === gradeFilter) &&
    (!subjectFilter || q.personalSubject === subjectFilter) &&
    (!topicFilter || q.personalTopic === topicFilter) &&
    (!query || [q.content, q.personalSubject, q.personalTopic, q.objectiveCode].join(' ').toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR')))
  ), [questions, gradeFilter, subjectFilter, topicFilter, query]);
  const currentSet = sets.find(s => s.id === setId);
  const setDirty = !currentSet || currentSet.title !== setTitle.trim() ||
    JSON.stringify(currentSet.questionIds) !== JSON.stringify(selectedIds);
  const updateDraft = (changes: Partial<Draft>) => setDraft(old => old ? { ...old, ...changes } : old);

  const saveQuestion = async () => {
    if (!draft || busy) return;
    if (draft.content.trim().length < 10) { setError('Soru kökü en az 10 karakter olmalıdır.'); return; }
    if (!draft.personalSubject.trim() || !draft.personalTopic.trim()) {
      setError('Ders ve konu alanlarını doldurun.'); return;
    }
    const options = draft.questionType === 'MULTIPLE_CHOICE' ? draft.options.slice(0, draft.optionCount).map(v => v.trim()) : [];
    if (draft.questionType === 'MULTIPLE_CHOICE' &&
      (options.some(x => !x) || !'ABCDE'.slice(0, draft.optionCount).includes(draft.correctAnswer))) {
      setError('Seçenekleri ve doğru cevabı tamamlayın.'); return;
    }
    if (draft.questionType === 'OPEN_ENDED' && !draft.modelAnswer.trim()) {
      setError('Açık uçlu sorunun model cevabını girin.'); return;
    }
    const typed = draft.questionType !== 'MULTIPLE_CHOICE' || draft.optionCount === 5;
    setBusy(true); setError(''); setNotice('');
    try {
      if (draft.id) {
        const patch: PatchQuestionInput = {
          expectedUpdatedAt: draft.expectedUpdatedAt!,
          content: draft.content.trim(), grade: draft.grade, explanation: draft.explanation || null,
          difficulty: draft.difficulty || null, options,
          correctAnswer: draft.questionType === 'MULTIPLE_CHOICE' ? draft.correctAnswer : null,
          personalSubject: draft.personalSubject.trim(), personalTopic: draft.personalTopic.trim(),
          ...(typed ? {
            questionType: draft.questionType,
            optionCount: draft.questionType === 'MULTIPLE_CHOICE' ? draft.optionCount : null,
            booleanAnswer: draft.questionType === 'TRUE_FALSE' ? draft.booleanAnswer : null,
            modelAnswer: draft.questionType === 'OPEN_ENDED' ? draft.modelAnswer.trim() : null
          } : {})
        };
        await patchQuestion(draft.id, patch);
        setNotice('Soru güncellendi ve kütüphanenizde saklandı.');
      } else {
        const input: CreateQuestionInput = {
          content: draft.content.trim(), grade: draft.grade,
          personalSubject: draft.personalSubject.trim(), personalTopic: draft.personalTopic.trim(),
          isPersonal: true, projectId: null, options,
          correctAnswer: draft.questionType === 'MULTIPLE_CHOICE' ? draft.correctAnswer : null,
          difficulty: draft.difficulty || null, explanation: draft.explanation || null,
          ...(typed ? {
            questionType: draft.questionType,
            optionCount: draft.questionType === 'MULTIPLE_CHOICE' ? draft.optionCount : null,
            booleanAnswer: draft.questionType === 'TRUE_FALSE' ? draft.booleanAnswer : null,
            modelAnswer: draft.questionType === 'OPEN_ENDED' ? draft.modelAnswer.trim() : null
          } : {})
        };
        await createQuestion(input);
        setNotice('Yeni soru kişisel kütüphanenize kaydedildi; yayınevi incelemesine gönderilmedi.');
      }
      setDraft(null);
      await reload();
    } catch (e: any) {
      setError(e.message || 'Soru kaydedilemedi. Başka sekmede güncellendiyse yeniden açın.');
    } finally { setBusy(false); }
  };

  const changeSelection = (id: number) => {
    setNotice('');
    setSelectedIds(old => old.includes(id) ? old.filter(x => x !== id) : [...old, id]);
  };
  const move = (i: number, delta: number) => {
    const next = i + delta;
    if (next < 0 || next >= selectedIds.length) return;
    setSelectedIds(old => { const values = [...old]; [values[i], values[next]] = [values[next], values[i]]; return values; });
  };
  const chooseSet = (set: PersonalQuestionSet) => {
    setSetId(set.id); setSetTitle(set.title);
    const known = new Set(questions.map(q => q.id));
    setSelectedIds(set.questionIds.filter(id => known.has(id)));
    setNotice('Kayıtlı set açıldı. Sıralamayı veya seçimi değiştirebilirsiniz.');
  };
  const persistSet = async () => {
    if (!selectedIds.length || !setTitle.trim()) {
      setError('En az bir soru seçin ve set adını yazın.'); return;
    }
    setBusy(true); setError('');
    try {
      const saved = await savePersonalSet({ setId: setId || undefined, title: setTitle, questionIds: selectedIds });
      setSetId(saved.id);
      setNotice('Soru seti ve sırası kaydedildi.');
      await reload();
    } catch (e: any) { setError(e.message || 'Set kaydedilemedi.'); }
    finally { setBusy(false); }
  };
  const exportSet = async () => {
    if (!setId || setDirty) { setError('Word indirmeden önce soru setini ve sırasını kaydedin.'); return; }
    setBusy(true); setError('');
    try { await downloadPersonalSet(setId, includeAnswers); setNotice('Düzenlenebilir Word belgesi indirildi.'); }
    catch (e: any) { setError(e.message || 'Word oluşturulamadı.'); }
    finally { setBusy(false); }
  };
  const eraseSet = async () => {
    if (!setId || !window.confirm('Bu soru setini silmek istiyor musunuz? Sorular silinmez.')) return;
    setBusy(true); setError('');
    try {
      await deletePersonalSet(setId);
      setSetId(null); setSetTitle(''); setSelectedIds([]);
      setNotice('Set silindi. Kişisel sorularınız korunuyor.');
      await reload();
    } catch(e: any) { setError(e.message || 'Set silinemedi.'); }
    finally { setBusy(false); }
  };

  return <div className="author-desk" aria-label="Yazar Masası">
    <header className="author-desk-heading">
      <div><span className="author-desk-eyebrow"><ShieldCheck size={15}/> YALNIZCA SİZE ÖZEL</span>
        <h1>Yazar Masası</h1>
        <p>Kendi sorularınızı hazırlayın, düzenleyin, setlerinizde sıralayın ve Word olarak dışa aktarın.</p>
      </div>
      <div className="author-desk-actions">
        <button type="button" className="secondary-button" onClick={onPublisher}>Yayınevi soru havuzu <BookMarked size={16}/></button>
        <button type="button" className="primary-button" onClick={() => { setDraft(emptyDraft()); setError(''); }}><Plus size={17}/> Yeni kişisel soru</button>
      </div>
    </header>
    <div className="author-desk-alert"><ShieldCheck size={18}/>
      <span>Bu kütüphane yayınevi havuzundan ayrıdır. Kişisel sorular editör onayına, otomatik yayına veya telif tahakkukuna girmez.</span>
    </div>
    {error && <p role="alert" className="author-desk-error">{error}</p>}
    {notice && <p role="status" className="author-desk-success"><Check size={16}/>{notice}</p>}
    {loading && <p role="status">Kişisel kütüphane yükleniyor…</p>}
    <section className="author-desk-section" aria-label="Kişisel soru kütüphanesi">
      <div className="author-desk-section-header"><div><span>KÜTÜPHANEM</span><h2>Kişisel Sorularım <small>{questions.length}</small></h2></div>
        <button type="button" className="text-button" onClick={() => void reload()} disabled={busy}><RefreshCw size={15}/> Yenile</button></div>
      <div className="author-desk-filters">
        <label><Search size={16}/> <input aria-label="Kişisel sorularda ara" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Soruda veya konuda ara..." /></label>
        <select aria-label="Sınıf filtresi" value={gradeFilter} onChange={e=>setGradeFilter(e.target.value)}>
          <option value="">Tüm sınıflar</option>{grades.map(g=><option key={g} value={g}>{g}</option>)}
        </select>
        <select aria-label="Ders filtresi" value={subjectFilter} onChange={e=>{setSubjectFilter(e.target.value);setTopicFilter('');}}>
          <option value="">Tüm dersler</option>{subjects.map(g=><option key={g} value={g}>{g}</option>)}
        </select>
        <select aria-label="Konu filtresi" value={topicFilter} onChange={e=>setTopicFilter(e.target.value)}>
          <option value="">Tüm konular</option>{topics.map(g=><option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      {!loading && !visible.length && <div className="author-desk-empty"><BookMarked size={27}/><strong>Henüz eşleşen kişisel soru yok.</strong><span>Yeni soru oluşturabilir veya filtreleri temizleyebilirsiniz.</span></div>}
      <div className="author-desk-question-list">
        {visible.map(q => <article key={q.id} className="author-desk-question">
          <label className="author-desk-select"><input aria-label={`Set için soru #${q.id} seç`} type="checkbox" checked={selectedIds.includes(q.id)} onChange={()=>changeSelection(q.id)}/></label>
          <div className="author-desk-question-main"><div className="author-desk-meta"><span>{q.personalSubject||'Ders belirtilmemiş'}</span><span>{q.grade||'-'}</span><span>{q.personalTopic||'Konu belirtilmemiş'}</span><span>#{q.id}</span></div>
            <div className="author-desk-question-text">{q.content.slice(0,190)}{q.content.length>190?'…':''}</div>
            <small>{typeNames[q.questionType||'MULTIPLE_CHOICE']} · Son kayıt: {new Date(q.updatedAt).toLocaleDateString('tr-TR')}</small>
          </div>
          <button className="secondary-button" type="button" onClick={()=>{setDraft(formFromQuestion(q));setError('');}}><PencilLine size={15}/> Aç / düzenle</button>
        </article>)}
      </div>
    </section>

    <section className="author-desk-section" aria-label="Kişisel soru setleri">
      <div className="author-desk-section-header"><div><span>SET OLUŞTURUCU</span><h2>Soru setlerim <small>{sets.length}</small></h2></div>
        <button type="button" className="secondary-button" onClick={()=>{setSetId(null);setSetTitle('');setSelectedIds([]);setNotice('Yeni bir set oluşturabilirsiniz.');}}><FolderPlus size={16}/> Yeni set</button></div>
      <div className="author-desk-set-layout">
        <div className="author-desk-saved-sets">
          <strong>Kayıtlı setler</strong>
          {sets.length===0&&<p>Henüz bir set kaydedilmedi.</p>}
          {sets.map(set=><button type="button" key={set.id} className={setId===set.id?'active':''} onClick={()=>chooseSet(set)}>
            <BookMarked size={18}/><span><b>{set.title}</b><small>{set.questionIds.length} soru · {new Date(set.updatedAt).toLocaleDateString('tr-TR')}</small></span></button>)}
        </div>
        <div className="author-desk-set-editor">
          <label className="author-desk-field">Set adı<input value={setTitle} maxLength={120} onChange={e=>setSetTitle(e.target.value)} placeholder="Örn. 8. Sınıf Matematik — Üslü Sayılar" /></label>
          <p>Seçili sorular: <strong>{selectedIds.length}</strong> · Yukarı / aşağı düğmeleriyle baskı sırasını belirleyin.</p>
          <ol className="author-desk-set-order">{selectedIds.map((id,i)=>{
            const q=questions.find(q=>q.id===id);
            return <li key={id}><span><b>{i+1}.</b> {q?.content.slice(0,72)||`#${id}`}</span>
              <div><button type="button" title="Yukarı taşı" aria-label={`Soru ${id} yukarı taşı`} disabled={i===0} onClick={()=>move(i,-1)}><ArrowUp size={15}/></button>
                <button type="button" title="Aşağı taşı" aria-label={`Soru ${id} aşağı taşı`} disabled={i===selectedIds.length-1} onClick={()=>move(i,1)}><ArrowDown size={15}/></button>
                <button type="button" title="Setten çıkar" aria-label={`Soru ${id} setten çıkar`} onClick={()=>changeSelection(id)}><X size={15}/></button></div>
            </li>;
          })}</ol>
          {selectedIds.length===0&&<p className="author-desk-hint">Üstteki listeden kutucukları işaretleyerek soru ekleyin.</p>}
          <div className="author-desk-set-bottom">
            <button type="button" className="primary-button" disabled={busy||!selectedIds.length||!setTitle.trim()} onClick={()=>void persistSet()}><Save size={17}/> {setId?'Seti güncelle':'Seti kaydet'}</button>
            {setId&&<button type="button" className="secondary-button" disabled={busy} onClick={()=>void eraseSet()}><Trash2 size={15}/> Seti sil</button>}
          </div>
          <div className="author-desk-word">
            <label><input type="checkbox" checked={includeAnswers} onChange={e=>setIncludeAnswers(e.target.checked)}/> Cevap anahtarı eklensin</label>
            <button type="button" className="secondary-button" disabled={busy||!setId||setDirty} onClick={()=>void exportSet()}><Download size={17}/> Word (.docx) indir</button>
            {setDirty&&<small>Word indirmek için önce seçiminizi ve sıralamanızı kaydedin.</small>}
          </div>
        </div>
      </div>
    </section>

    {draft&&<div className="author-desk-overlay" role="presentation">
      <section className="author-desk-modal" role="dialog" aria-modal="true" aria-label={draft.id?'Kişisel soruyu düzenle':'Kişisel soru oluştur'}>
        <div className="author-desk-modal-head"><div><span>KİŞİSEL SORU EDİTÖRÜ</span><h2>{draft.id?'Soru düzenle':'Yeni kişisel soru'}</h2></div>
          <button type="button" aria-label="Editörü kapat" disabled={busy} onClick={()=>setDraft(null)}><X size={20}/></button></div>
        <div className="author-desk-edit-grid">
          <label className="author-desk-field">Ders<input value={draft.personalSubject} maxLength={100} onChange={e=>updateDraft({personalSubject:e.target.value})} placeholder="Örn. Matematik" /></label>
          <label className="author-desk-field">Sınıf<select value={draft.grade} onChange={e=>updateDraft({grade:e.target.value})}>{grades.map(g=><option key={g} value={g}>{g}</option>)}</select></label>
          <label className="author-desk-field">Konu<input value={draft.personalTopic} maxLength={100} onChange={e=>updateDraft({personalTopic:e.target.value})} placeholder="Örn. Rasyonel sayılar" /></label>
          <label className="author-desk-field">Soru türü<select value={draft.questionType} disabled={!!draft.id} onChange={e=>updateDraft({questionType:e.target.value as Kind})}>
            {Object.entries(typeNames).map(([key,label])=><option key={key} value={key}>{label}</option>)}
          </select></label>
        </div>
        <div className="author-desk-question-editor"><strong>Soru kökü</strong>
          <QuestionStemWysiwygEditor value={draft.content} onChange={content=>updateDraft({content})} maxLength={1200} />
        </div>
        {draft.questionType==='MULTIPLE_CHOICE'&&<>
          <label className="author-desk-field">Seçenek sayısı
            <select value={draft.optionCount} disabled={!!draft.id} onChange={e=>updateDraft({optionCount:Number(e.target.value) as 4|5,correctAnswer:'A'})}>
              <option value={4}>4 seçenek</option><option value={5}>5 seçenek</option>
            </select></label>
          <div className="author-desk-option-grid">{draft.options.slice(0,draft.optionCount).map((option,i)=>
            <label key={i} className="author-desk-field">{String.fromCharCode(65+i)} seçeneği
              <input value={option} maxLength={500} onChange={e=>{const next=[...draft.options];next[i]=e.target.value;updateDraft({options:next});}}/>
            </label>)}</div>
          <label className="author-desk-field">Doğru cevap<select value={draft.correctAnswer} onChange={e=>updateDraft({correctAnswer:e.target.value})}>
            {draft.options.slice(0,draft.optionCount).map((_,i)=>{const c=String.fromCharCode(65+i);return <option key={c} value={c}>{c}</option>;})}
          </select></label>
        </>}
        {draft.questionType==='TRUE_FALSE'&&<label className="author-desk-field">Doğru cevap<select value={draft.booleanAnswer?'dogru':'yanlis'} onChange={e=>updateDraft({booleanAnswer:e.target.value==='dogru'})}><option value="dogru">Doğru</option><option value="yanlis">Yanlış</option></select></label>}
        {draft.questionType==='OPEN_ENDED'&&<label className="author-desk-field">Model cevap<textarea value={draft.modelAnswer} onChange={e=>updateDraft({modelAnswer:e.target.value})}/></label>}
        <label className="author-desk-field">Çözüm / açıklama (isteğe bağlı)<textarea maxLength={600} value={draft.explanation} onChange={e=>updateDraft({explanation:e.target.value})}/></label>
        <div className="author-desk-preview"><h3>Canlı önizleme</h3><QuestionTypePreview question={{content:draft.content,questionType:draft.questionType,optionCount:draft.questionType==='MULTIPLE_CHOICE'?draft.optionCount:null,options:draft.questionType==='MULTIPLE_CHOICE'?draft.options.slice(0,draft.optionCount):[],correctAnswer:draft.questionType==='MULTIPLE_CHOICE'?draft.correctAnswer:null,booleanAnswer:draft.questionType==='TRUE_FALSE'?draft.booleanAnswer:null,modelAnswer:draft.questionType==='OPEN_ENDED'?draft.modelAnswer:null,explanation:draft.explanation}}/></div>
        <p className="author-desk-hint">Kaydetmek yalnız kişisel kütüphaneyi günceller. Editör onayı veya telif oluşturulmaz.</p>
        <div className="author-desk-modal-footer"><button type="button" className="secondary-button" disabled={busy} onClick={()=>setDraft(null)}>Vazgeç</button>
          <button type="button" className="primary-button" disabled={busy} onClick={()=>void saveQuestion()}><FilePlus2 size={17}/>{busy?'Kaydediliyor…':'Soruyu kaydet'}</button></div>
      </section></div>}
  </div>;
}
