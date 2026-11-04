import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, BookMarked, Check, Copy, Download, FilePlus2, FolderPlus, PencilLine, Plus, RefreshCw, Save, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import type { ApiQuestion, CreateQuestionInput, PatchQuestionInput, QuestionAssetInput, QuestionAssetPlacement } from './types';
import type { QuestionStudioFormValues } from './studio-state';
import { GuidedQuestionStudio } from './GuidedQuestionStudio';
import { GRADES_BY_LEVEL, levelForGrade } from '../projects/integration';
import './personal-studio.css';
import { createQuestion, patchQuestion } from './api';
import { allowsFiveOptions } from '../../shared/question-contract';
import { personalGradeSelection } from './question-editor-consistency';
import { copyPersonalToPublisher, deletePersonalSet, downloadPersonalSet, fetchPersonalQuestions, fetchPersonalSets, savePersonalSet, type PersonalQuestionSet } from './personal-library-api';
import { PersonalQuestionSummary, summarizePersonalQuestion } from './PersonalQuestionSummary';
import './author-desk.css';

type Kind = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'OPEN_ENDED';
type Draft = {
  id: number | null; expectedUpdatedAt: string | null; content: string; grade: string;
  personalSubject: string; personalTopic: string; questionType: Kind;
  optionCount: 4 | 5; options: string[]; correctAnswer: string;
  booleanAnswer: boolean | null; modelAnswer: string; explanation: string; difficulty: string;
  objectiveCode: string; scoringRubric: string; evaluationCriteria: string;
  assets: QuestionAssetInput[]; assetsTouched: boolean;
  assetPlacement: QuestionAssetPlacement; assetType: 'IMAGE'|'VIDEO_URL'|'LINK';
  assetUrl: string; assetTitle: string; assetAltText: string;
};
const emptyDraft = (): Draft => ({
  id: null, expectedUpdatedAt: null, content: '', grade: '8. Sınıf',
  personalSubject: '', personalTopic: '', questionType: 'MULTIPLE_CHOICE',
  optionCount: 4, options: ['', '', '', '', ''], correctAnswer: '',
  booleanAnswer: null, modelAnswer: '', explanation: '', difficulty: '',
  objectiveCode: '', scoringRubric: '', evaluationCriteria: '', assets: [], assetsTouched: false,
  assetPlacement: 'STEM', assetType: 'IMAGE', assetUrl: '', assetTitle: '', assetAltText: ''
});
function formFromQuestion(q: ApiQuestion): Draft {
  return {
    id: q.id, expectedUpdatedAt: q.updatedAt, content: q.content, grade: q.grade || '8. Sınıf',
    personalSubject: q.personalSubject || '', personalTopic: q.personalTopic || '',
    questionType: q.questionType || 'MULTIPLE_CHOICE',
    optionCount: q.optionCount === 5 ? 5 : 4,
    options: [...(q.options || []), '', '', '', '', ''].slice(0, 5),
    correctAnswer: q.correctAnswer || '', booleanAnswer: q.booleanAnswer ?? null,
    modelAnswer: q.modelAnswer || '', explanation: q.explanation || '', difficulty: q.difficulty || '',
    objectiveCode: q.objectiveCode || '', scoringRubric: q.scoringRubric || '', evaluationCriteria: q.evaluationCriteria || '',
    assets: (q.assets || []).map(asset => ({ ...asset })), assetsTouched: false,
    assetPlacement: 'STEM', assetType: 'IMAGE', assetUrl: '', assetTitle: '', assetAltText: ''
  };
}
const grades = Array.from({length: 12}, (_, i) => `${i + 1}. Sınıf`).concat('Mezun');
const typeNames: Record<Kind, string> = {
  MULTIPLE_CHOICE: 'Çoktan Seçmeli', TRUE_FALSE: 'Doğru / Yanlış', OPEN_ENDED: 'Açık Uçlu'
};

export function AuthorDesk({ onPublisher }: { onPublisher: (copied?: ApiQuestion & { existingCopy?: boolean }) => void }) {
  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [sets, setSets] = useState<PersonalQuestionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copyingId, setCopyingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [personalStep, setPersonalStep] = useState(1);
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
  // PERSONAL-STUDIO-01: same five-stage component, separate personal API target.
  const personalLevel = draft ? (levelForGrade(draft.grade) ?? 'Ortaokul') : 'Ortaokul';
  const personalValues: QuestionStudioFormValues | null = draft ? {
    content: draft.content, level: personalLevel, grade: draft.grade, projectId: null,
    options: draft.options, correctAnswer: draft.correctAnswer, explanation: draft.explanation,
    questionType: draft.questionType, optionCount: draft.optionCount,
    booleanAnswer: draft.booleanAnswer, modelAnswer: draft.modelAnswer,
    scoringRubric: draft.scoringRubric, evaluationCriteria: draft.evaluationCriteria,
    objectiveCode: draft.objectiveCode, difficulty: draft.difficulty,
    assets: draft.assets, assetPlacement: draft.assetPlacement, assetType: draft.assetType,
    assetUrl: draft.assetUrl, assetTitle: draft.assetTitle, assetAltText: draft.assetAltText
  } : null;
  const onPersonalValues = (next: QuestionStudioFormValues) => {
    setDraft(old => old ? {
      ...old, content: next.content, grade: next.grade, options: next.options,
      correctAnswer: next.correctAnswer, explanation: next.explanation,
      questionType: next.questionType ?? old.questionType,
      optionCount: next.optionCount === 5 ? 5 : (next.optionCount === 4 ? 4 : old.optionCount),
      booleanAnswer: typeof next.booleanAnswer === 'boolean' ? next.booleanAnswer : null,
      modelAnswer: next.modelAnswer || '', scoringRubric: next.scoringRubric || '',
      evaluationCriteria: next.evaluationCriteria || '', objectiveCode: next.objectiveCode || '',
      difficulty: next.difficulty || '',
      assets: next.assets, assetPlacement: next.assetPlacement, assetType: next.assetType,
      assetUrl: next.assetUrl, assetTitle: next.assetTitle, assetAltText: next.assetAltText
    } : old);
  };
  const choosePersonalGrade = (grade: string) => {
    if (!draft) return;
    if (draft.id && draft.optionCount === 5 && !allowsFiveOptions(grade)) {
      setError('Kayıtlı beş seçenekli soru yalnız lise ve mezun düzeyindedir.'); return;
    }
    updateDraft(personalGradeSelection(draft, grade));
  };
  const addPersonalAsset = (placement: QuestionAssetPlacement) => {
    if (!draft) return;
    const url = draft.assetUrl.trim();
    let valid = false;
    try { const parsed = new URL(url); valid = ['https:','http:'].includes(parsed.protocol); } catch { /* invalid */ }
    if (!valid) { setError('Medya için geçerli bir http/https bağlantısı girin.'); return; }
    if (draft.assets.length >= 12) { setError('Bir soruya en fazla 12 medya öğesi eklenebilir.'); return; }
    updateDraft({
      assets: [...draft.assets, { placement, assetType: draft.assetType, url,
        title: draft.assetTitle.trim() || null, altText: draft.assetAltText.trim() || null,
        sortOrder: draft.assets.length }], assetsTouched: true,
      assetUrl: '', assetTitle: '', assetAltText: ''
    });
    setError('');
  };
  const removePersonalAsset = (index: number) => {
    if (!draft) return;
    updateDraft({ assets: draft.assets.filter((_, i) => i !== index), assetsTouched: true });
  };
  const renderPersonalAssets = (placement: QuestionAssetPlacement) => <>
    {draft?.assets.filter(a => a.placement === placement).map((asset, index) =>
      asset.assetType === 'IMAGE'
        ? <img key={index} className="personal-studio-media-preview" src={asset.url} alt={asset.altText || asset.title || 'Soru görseli'} />
        : <a key={index} href={asset.url} target="_blank" rel="noopener noreferrer">{asset.title || 'Soru bağlantısı'}</a>
    )}
  </>;


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
    if (draft.questionType === 'MULTIPLE_CHOICE' && draft.optionCount === 5 && !allowsFiveOptions(draft.grade)) {
      setError('Beş seçenek yalnızca 9–12. sınıflar ve mezun düzeyinde kullanılabilir.'); return;
    }
    if (draft.questionType === 'TRUE_FALSE' && typeof draft.booleanAnswer !== 'boolean') {
      setError('Doğru/Yanlış cevabını açıkça seçin.'); return;
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
          objectiveCode: draft.objectiveCode || null,
          ...(draft.assetsTouched ? { assets: draft.assets } : {}),
          ...(typed ? {
            questionType: draft.questionType,
            optionCount: draft.questionType === 'MULTIPLE_CHOICE' ? draft.optionCount : null,
            booleanAnswer: draft.questionType === 'TRUE_FALSE' ? draft.booleanAnswer : null,
            modelAnswer: draft.questionType === 'OPEN_ENDED' ? draft.modelAnswer.trim() : null,
            scoringRubric: draft.questionType === 'OPEN_ENDED' ? draft.scoringRubric.trim() || null : null,
            evaluationCriteria: draft.questionType === 'OPEN_ENDED' ? draft.evaluationCriteria.trim() || null : null
          } : {})
        };
        await patchQuestion(draft.id, patch);
        setNotice('Soru güncellendi ve kütüphanenizde saklandı.');
      } else {
        const input: CreateQuestionInput = {
          content: draft.content.trim(), grade: draft.grade,
          personalSubject: draft.personalSubject.trim(), personalTopic: draft.personalTopic.trim(),
          objectiveCode: draft.objectiveCode || null,
          ...(draft.assetsTouched ? { assets: draft.assets } : {}),
          isPersonal: true, projectId: null, options,
          correctAnswer: draft.questionType === 'MULTIPLE_CHOICE' ? draft.correctAnswer : null,
          difficulty: draft.difficulty || null, explanation: draft.explanation || null,
          ...(typed ? {
            questionType: draft.questionType,
            optionCount: draft.questionType === 'MULTIPLE_CHOICE' ? draft.optionCount : null,
            booleanAnswer: draft.questionType === 'TRUE_FALSE' ? draft.booleanAnswer : null,
            modelAnswer: draft.questionType === 'OPEN_ENDED' ? draft.modelAnswer.trim() : null,
            scoringRubric: draft.questionType === 'OPEN_ENDED' ? draft.scoringRubric.trim() || null : null,
            evaluationCriteria: draft.questionType === 'OPEN_ENDED' ? draft.evaluationCriteria.trim() || null : null
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
  const copyForPublisher = async (question: ApiQuestion) => {
    if (copyingId !== null || busy) return;
    setCopyingId(question.id); setError(''); setNotice('');
    try {
      const copied = await copyPersonalToPublisher(question.id, question.updatedAt);
      // Open a freshly loaded publisher list immediately, instead of leaving
      // the author on a stale Questions screen that encourages duplicate clicks.
      onPublisher(copied);
    } catch (err: any) {
      setError(err?.message || 'Yayınevi taslağı oluşturulamadı.');
    } finally { setCopyingId(null); }
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
        <button type="button" className="secondary-button" onClick={() => onPublisher()}>Yayınevi soru havuzu <BookMarked size={16}/></button>
        <button type="button" className="primary-button" onClick={() => { setPersonalStep(1);setDraft(emptyDraft()); setError(''); }}><Plus size={17}/> Yeni kişisel soru</button>
      </div>
    </header>
    <div className="author-desk-alert"><ShieldCheck size={18}/>
      <span>Kişisel sorular editör incelemesine veya telife otomatik girmez. Yayınevine göndermek isterseniz ayrı bir taslak kopyası oluşturun; kişisel asıl soru korunur.</span>
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
            <PersonalQuestionSummary content={q.content}/>
            <small>{typeNames[q.questionType||'MULTIPLE_CHOICE']} · Son kayıt: {new Date(q.updatedAt).toLocaleDateString('tr-TR')}</small>
          </div>
          <div className="author-desk-question-actions">
            <button className="secondary-button" type="button" disabled={busy || copyingId !== null} onClick={()=>{setPersonalStep(1);setDraft(formFromQuestion(q));setError('');}}><PencilLine size={15}/> Aç / düzenle</button>
            <button className="secondary-button" type="button" disabled={busy || copyingId !== null || q.status !== 'TASLAK'} aria-busy={copyingId === q.id} onClick={() => void copyForPublisher(q)}>
              <Copy size={15}/> {copyingId === q.id ? 'Kopyalanıyor…' : 'Yayınevi taslağına kopyala'}
            </button>
          </div>
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
            return <li key={id}><span><b>{i+1}.</b> {q ? summarizePersonalQuestion(q.content, 72).text : `#${id}`}</span>
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

    {draft && personalValues && <div className="author-desk-overlay personal-studio-overlay" role="presentation">
      <section className="author-desk-modal personal-studio-modal" role="dialog" aria-modal="true" aria-label={draft.id ? 'Kişisel soruyu düzenle' : 'Kişisel soru oluştur'}>
        <header className="author-desk-modal-head">
          <div><span>KİŞİSEL KÜTÜPHANE / ORTAK EDİTÖR</span><h2>{draft.id ? 'Kişisel soruyu düzenle' : 'Yeni kişisel soru'}</h2></div>
          <button type="button" disabled={busy} aria-label="Editörü kapat" onClick={() => { if (window.confirm('Kaydedilmemiş değişiklikler kaybolabilir. Editörü kapatmak istiyor musunuz?')) setDraft(null); }}><X size={20} /></button>
        </header>
        <div className="personal-studio-context" role="note"><ShieldCheck size={17} aria-hidden="true"/>
          <span><strong>Kişisel mod.</strong> Kaydettiğiniz soru yalnızca sizin kütüphanenize eklenir. Yayınevine otomatik gönderilmez.</span>
        </div>
        {error && <p className="author-desk-error" role="alert">{error}</p>}
        <GuidedQuestionStudio
          values={personalValues} onChange={onPersonalValues}
          step={personalStep} onStepChange={setPersonalStep}
          projects={[]} projectsLoading={false} projectsError="" originalProjectId={null}
          levels={Object.keys(GRADES_BY_LEVEL)} grades={[...GRADES_BY_LEVEL[personalLevel]]}
          onProject={() => {}} onLevel={level => choosePersonalGrade(GRADES_BY_LEVEL[level as keyof typeof GRADES_BY_LEVEL]?.[0] ?? draft.grade)}
          onGrade={choosePersonalGrade}
          branchName={draft.personalSubject} editing={Boolean(draft.id)} disabled={busy} sandbox={false}
          onAddAsset={addPersonalAsset} onRemoveAsset={removePersonalAsset} renderAssets={renderPersonalAssets}
          personal={{ subject: draft.personalSubject, topic: draft.personalTopic,
            onSubjectChange: personalSubject => updateDraft({personalSubject}),
            onTopicChange: personalTopic => updateDraft({personalTopic}) }}
        />
        <footer className="author-desk-modal-footer personal-studio-save">
          <span>Yalnızca kişisel kütüphanenize kaydedilir.</span>
          <button type="button" className="secondary-button" disabled={busy} onClick={() => { if (window.confirm('Kaydedilmemiş değişiklikler kaybolabilir. Vazgeçilsin mi?')) setDraft(null); }}>Vazgeç</button>
          <button type="button" className="primary-button" disabled={busy} onClick={() => void saveQuestion()}><FilePlus2 size={17}/>{busy ? 'Kaydediliyor…' : 'Kişisel kütüphaneme kaydet'}</button>
        </footer>
      </section></div>}
  </div>;
}
