import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, BookOpen, Check, FileDown, RefreshCw, RotateCcw } from 'lucide-react';
import type { ApiQuestion, QuestionAssetPlacement } from '../questions/types';
import type { ApiProject } from '../projects/types';
import { StudioMarkup } from '../questions/StudioDocumentPreview';
import { approvedForPublishing, bookAnswer, bookMediaWarnings, moveBookQuestion, resolveBookOrder } from './book-assembly';
import { PublishingPersistencePanel } from './PublishingPersistencePanel';
import { flattenSingleChapter, frozenBookQuestions, publishingV2PreviewEnabled, type SavedBook } from './book-persistence-client';
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
  const [title, setTitle] = useState('Yeni Soru Kitabı');
  const [chapter, setChapter] = useState('Bölüm 1 · Sorular');
  const [projectFilter, setProjectFilter] = useState(initialProjectId ? String(initialProjectId) : 'all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [columns, setColumns] = useState<1 | 2>(1);
  const [withAnswerKey, setWithAnswerKey] = useState(false);
  // Both environment markers are required: V1 remains fully read-only everywhere else.
  const publishingPreview = publishingV2PreviewEnabled(import.meta.env as unknown as {
    VITE_PUBLISHING_V2_PREVIEW?: string; VITE_VERCEL_ENV?: string;
  });
  const [activeBook, setActiveBook] = useState<SavedBook | null>(null);

  function openSavedBook(book: SavedBook) {
    const single = flattenSingleChapter(book);
    setActiveBook(book);
    setTitle(book.title);
    setChapter(single.chapter);
    setSelectedIds(single.questionIds);
    setProjectFilter(String(book.projectId));
    setColumns(book.layoutColumns === 2 ? 2 : 1);
    setWithAnswerKey(false);
    setSearch('');
  }

  function startNewBook() {
    setActiveBook(null);
    setTitle('Yeni Soru Kitabı');
    setChapter('Bölüm 1 · Sorular');
    setSelectedIds([]);
    setProjectFilter('all');
    setColumns(1);
    setWithAnswerKey(false);
    setSearch('');
  }

  const eligible = useMemo(() => approvedForPublishing(questions), [questions]);
  const projectOptions = useMemo(() => {
    const options = new Map<number, string>();
    if (activeBook?.project) options.set(activeBook.projectId, activeBook.project.code + ' · ' + activeBook.project.title);
    projects.filter(project => project.status !== 'Arsiv').forEach(project => {
      options.set(project.id, project.code + ' · ' + project.title);
    });
    return [...options.entries()].sort((a, b) => a[1].localeCompare(b[1], 'tr-TR'));
  }, [projects, activeBook]);
  const candidates = useMemo(() => eligible.filter(question => {
    if (projectFilter !== 'all' && question.projectId !== Number(projectFilter)) return false;
    const query = search.trim().toLocaleLowerCase('tr-TR');
    if (!query) return true;
    return (question.content + ' ' + (question.grade || '') + ' ' + (question.project?.code || '')).toLocaleLowerCase('tr-TR').includes(query);
  }), [eligible, projectFilter, search]);

  const bookQuestions = useMemo(() => {
    // Newly selected questions use current approved sources. A reopened book
    // displays its frozen snapshot even if the live question was later removed.
    const live = resolveBookOrder(eligible, selectedIds);
    if (!activeBook) return live;
    const snapshots = new Map(frozenBookQuestions(activeBook).map(question => [question.id, question]));
    const liveMap = new Map(live.map(question => [question.id, question]));
    return selectedIds.map(id => snapshots.get(id) ?? liveMap.get(id))
      .filter((question): question is ApiQuestion => question !== undefined);
  }, [eligible, selectedIds, activeBook]);
  const warnings = useMemo(() => bookMediaWarnings(bookQuestions), [bookQuestions]);
  const printable = bookQuestions.length > 0 && title.trim().length > 0 && !error && !loading;

  function toggle(id: number) {
    setSelectedIds(ids => ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id]);
  }

  return <div className="publishing-workbench">
    <div className="page-heading publishing-heading">
      <div><div className="eyebrow">YAYINCILIK · 1. AŞAMA</div><h1>Yayın Hazırlık Atölyesi</h1>
        <p>Onaylı sorulardan kitap taslağı oluşturun, soruları sıralayın ve baskı önizlemesini hazırlayın.</p></div>
      <span className="heading-chip"><BookOpen size={16} /> Önizleme sürümü</span>
    </div>
    <p className="publishing-boundary" role="note">
      {publishingPreview
        ? 'Kalıcı taslak kaydı yalnız izole V2 önizleme veritabanında açıktır; canlı Production kapalıdır.'
        : 'Bu aşamada kitap ve soru seçimleri yalnızca bu tarayıcı oturumundadır; sunucuya kaydedilmez.'}
      {publishingPreview
        ? 'Word (.docx) için Genel Koordinatörün kaydettiği tek sütunlu kitap taslağında onaylı sorular kullanılır. İzole P3 önizlemesindeki soruya bağlı özel PNG çizimleri Word çıktısına eklenir; harici medya ve desteklenmeyen matematik dizgisi çıktıyı engelleyebilir. ISBN ve nihai matbaa dizgisi henüz hazır değildir.'
        : 'PDF için Yazdır → PDF olarak kaydet seçeneğini kullanın. Gerçek Word (.docx), kalıcı kitap kayıtları, ISBN ve matbaa dizgisi bu ortamda henüz hazır değildir. Görsel ve formülleri baskıdan önce kontrol edin.'}
    </p>

    {publishingPreview && <PublishingPersistencePanel
      questions={questions}
      loading={loading}
      sourceError={error}
      view={{ title, chapter, columns, projectFilter, selectedIds }}
      activeBook={activeBook}
      onOpen={openSavedBook}
      onNew={startNewBook}
    />}

    <div className="publishing-controls">
      <section className="panel publishing-settings" aria-label="Kitap düzeni">
        <h2>1. Kitap bilgileri</h2>
        <label>Kitap adı<input maxLength={120} value={title} onChange={e => setTitle(e.target.value)} /></label>
        <label>Bölüm başlığı<input maxLength={120} value={chapter} onChange={e => setChapter(e.target.value)} /></label>
        <label>Sayfa düzeni<select value={columns} onChange={e => setColumns(e.target.value === '2' ? 2 : 1)}>
          <option value="1">A4 · Tek sütun</option><option value="2">A4 · Çift sütun</option>
        </select></label>
        <label className="publishing-check"><input type="checkbox" checked={withAnswerKey}
          onChange={e => setWithAnswerKey(e.target.checked)} /> Cevap anahtarını ayrı sayfada ekle</label>
      </section>

      <section className="panel publishing-select" aria-label="Onaylı soru seçimi">
        <div className="publishing-panel-heading"><h2>2. Soruları seçin</h2>
          <button type="button" className="secondary-button" disabled={loading} onClick={() => void onRefresh()}><RefreshCw size={15}/> Yenile</button>
        </div>
        <p>Yalnızca oturum yetkinizle erişilen, onaylanmış ve arşivlenmemiş sorular. Görünen liste, tüm sistem için eksiksiz soru sayımı değildir.</p>
        <div className="publishing-filters">
          <label>Proje<select value={projectFilter} disabled={publishingPreview && Boolean(activeBook)} onChange={e => setProjectFilter(e.target.value)}>
            <option value="all">Tüm erişilebilir projeler</option>
            {projectOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select></label>
          <label>Soru ara<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Soru metni, sınıf, proje kodu" /></label>
        </div>
        {loading && <p role="status">Onaylı soru listesi yükleniyor…</p>}
        {error && <p role="alert" className="publishing-error">Soru listesi yüklenemedi: {error}</p>}
        {!loading && !error && candidates.length === 0 && <p className="publishing-empty">Bu kapsamda baskıya uygun onaylı soru bulunamadı.</p>}
        {!loading && !error && <div className="publishing-candidates">
          {candidates.map(question => <label key={question.id} className="publishing-candidate">
            <input type="checkbox" checked={selectedIds.includes(question.id)} onChange={() => toggle(question.id)} />
            <span><strong>#{question.id} · {question.project?.code || 'Projesiz'} · {question.grade || 'Sınıfsız'}</strong>
              <small>{question.content.slice(0, 180)}</small></span>
          </label>)}
        </div>}
      </section>

      <section className="panel publishing-order" aria-label="Seçilmiş soru sırası">
        <h2>3. Kitap sırası</h2><p>{bookQuestions.length} onaylı soru seçildi.</p>
        {bookQuestions.length > 0 && <button type="button" className="secondary-button" onClick={() => setSelectedIds([])}><RotateCcw size={14} /> Seçimi temizle</button>}
        <ol>{bookQuestions.map((question, index) => <li key={question.id}><span><strong>{index + 1}. Soru · #{question.id}</strong>
          <small>{question.grade || 'Sınıf yok'} · {question.project?.code || 'Projesiz'}</small></span>
          <div><button type="button" disabled={index === 0} onClick={() => setSelectedIds(moveBookQuestion(bookQuestions.map(item => item.id), question.id, -1))} aria-label={'Soru ' + question.id + ' yukarı'}><ArrowUp size={15}/></button>
          <button type="button" disabled={index === bookQuestions.length - 1} onClick={() => setSelectedIds(moveBookQuestion(bookQuestions.map(item => item.id), question.id, 1))} aria-label={'Soru ' + question.id + ' aşağı'}><ArrowDown size={15}/></button>
          <button type="button" onClick={() => toggle(question.id)} aria-label={'Soru ' + question.id + ' çıkar'}>Çıkar</button></div>
        </li>)}</ol>
      </section>
    </div>

    <div className="publishing-preview-toolbar">
      <div><h2>4. Kitap önizlemesi</h2><p>Öğrenci nüshasında cevaplar işaretlenmez. Cevap anahtarı isteğe bağlı, ayrı bölüm olarak eklenir.</p></div>
      <button className="primary-button" type="button" disabled={!printable} onClick={() => window.print()}><FileDown size={17}/> Yazdır / PDF</button>
    </div>
    {warnings.map(warning => <p key={warning} className="publishing-warning" role="note">{warning}</p>)}
    {!bookQuestions.length && <div className="panel publishing-empty">Kitap önizlemesi için en az bir onaylı soru seçin.</div>}
    {bookQuestions.length > 0 && <div className="publishing-page" aria-label="Kitap baskı önizlemesi">
      <div className="publishing-cover"><small>PRO-LİG · YAYIN ÖNİZLEMESİ</small><h2>{title.trim() || 'Başlıksız Kitap'}</h2>
        <p>{chapter.trim()}</p><small>{bookQuestions.length} soru · {columns === 2 ? 'Çift sütun' : 'Tek sütun'}</small></div>
      <h3 className="publishing-chapter-heading">{chapter.trim() || 'Sorular'}</h3>
      <div className={columns === 2 ? 'publishing-page-body two-columns' : 'publishing-page-body'}>
        {bookQuestions.map((question, index) => <QuestionForBook key={question.id} question={question} ordinal={index + 1} />)}
      </div>
      {withAnswerKey && <section className="publishing-key" aria-label="Cevap anahtarı">
        <h3>Cevap Anahtarı</h3>
        <ol>{bookQuestions.map((question, index) => <li key={question.id}><strong>{index + 1}.</strong> <StudioMarkup value={bookAnswer(question)} /></li>)}</ol>
      </section>}
      <p className="publishing-footnote">PRO-LİG yayın önizlemesi · Nihai dizgi ve içerik onayı yapılmamıştır.</p>
    </div>}
    {bookQuestions.length > 0 && <p className="publishing-selected-status" role="status"><Check size={15}/> {bookQuestions.length} soruluk önizleme hazır. Baskıdan önce cevap anahtarı ve görselleri kontrol edin.</p>}
  </div>;
}
