import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Download, RefreshCw, Save } from 'lucide-react';
import type { ApiQuestion } from '../questions/types';
import {
  fetchSavedBookDocx, formatQuestionOrder, flattenSingleChapter, listBookDrafts, loadBookDraft,
  prepareBookSave, PublishingApiError, sameQuestionOrder, saveBookDraft,
  type BookWorkbenchInput, type SavedBook, type SavedBookSummary
} from './book-persistence-client';

type Props = {
  questions: ApiQuestion[];
  loading: boolean;
  sourceError: string;
  view: BookWorkbenchInput;
  activeBook: SavedBook | null;
  onOpen: (book: SavedBook) => void;
  onNew: () => void;
};

export function PublishingPersistencePanel({ questions, loading, sourceError, view, activeBook, onOpen, onNew }: Props) {
  const [records, setRecords] = useState<SavedBookSummary[]>([]);
  const [listing, setListing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // A confirmed POST must never be repeated if the subsequent GET fails.
  const [committedPendingId, setCommittedPendingId] = useState<number | null>(null);
  const busyRef = useRef(false);

  const refreshRecords = useCallback(async () => {
    setListing(true);
    setError('');
    try {
      const next = await listBookDrafts();
      setRecords(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kitap listesi alınamadı.');
    } finally {
      setListing(false);
    }
  }, []);

  useEffect(() => { void refreshRecords(); }, [refreshRecords]);

  async function open(id: number) {
    if (busyRef.current) return;
    if (view.selectedIds.length &&
        !window.confirm('Mevcut ekrandaki kaydedilmemiş değişiklikleri bırakıp bu kitabı açmak istiyor musunuz?')) return;
    busyRef.current = true;
    setBusy(true); setError(''); setNotice('');
    try {
      const loaded = await loadBookDraft(id);
      if (loaded.chapters.length !== 1) {
        throw new PublishingApiError(422, 'Bu kayıt birden fazla bölüm içeriyor; tek bölümlü atölye ile değiştirilemez.');
      }
      onOpen(loaded);
      setCommittedPendingId(null);
      setNotice('Kitap taslağının kaydedilmiş sürümü açıldı. Öğrenci önizlemesi kayıtlı soru metnini gösteriyor.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Taslak açılamadı.');
    } finally {
      busyRef.current = false; setBusy(false);
    }
  }

  async function save() {
    if (busyRef.current || committedPendingId !== null) return;
    busyRef.current = true;
    setBusy(true); setError(''); setNotice('');
    try {
      if (loading || sourceError) {
        throw new PublishingApiError(409, 'Soru havuzu yüklenemedi. Soruları yenileyip tekrar deneyin.');
      }
      const payload = prepareBookSave(view, questions, activeBook);
      const result = await saveBookDraft(payload, activeBook?.id ?? null);
      // The write succeeded: do not allow a second POST/PATCH while recovering
      // the read-back, even when that subsequent GET fails or times out.
      setCommittedPendingId(result.id);
      let reopened: SavedBook;
      try {
        reopened = await loadBookDraft(result.id);
      } catch {
        setError('Kitap sunucuya kaydedildi (#' + result.id + '), ancak yeniden açma isteği başarısız. Tekrar Kaydet düğmesine basmayın; Kaydı Geri Getir seçeneğini kullanın.');
        return;
      }
      const storedOrder = flattenSingleChapter(reopened).questionIds;
      const requestedOrder = payload.chapters[0].questionIds;
      if (!sameQuestionOrder(requestedOrder, storedOrder)) {
        // Preserve the visible selection instead of silently replacing it
        // with the wrong server order. The write already committed: no retry.
        setError('Revizyon ' + result.revision + ' sunucuya kaydedildi, ancak soru sırası uyuşmuyor. '
          + 'İstenen: ' + formatQuestionOrder(requestedOrder) + '. Kaydedilen: '
          + formatQuestionOrder(storedOrder)
          + '. Mevcut seçimler korundu. Yeniden Kaydet düğmesini kullanmayın; kayıtlı sürümü inceleyin.');
        return;
      }
      onOpen(reopened);
      setCommittedPendingId(null);
      setNotice('Kitap taslağı kaydedildi. Güncel sürüm: ' + result.revision
        + '. Kaydedilen soru sırası doğrulandı: ' + formatQuestionOrder(storedOrder) + '.');
      await refreshRecords();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kitap kaydedilemedi. Yeniden deneyin.');
    } finally {
      busyRef.current = false; setBusy(false);
    }
  }

  async function recoverCommitted() {
    if (committedPendingId == null || busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      const reopened = await loadBookDraft(committedPendingId);
      onOpen(reopened);
      setCommittedPendingId(null);
      setNotice('Kaydedilmiş kitap güvenle yeniden açıldı.');
      await refreshRecords();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilen taslak yeniden açılamadı.');
    } finally {
      busyRef.current = false; setBusy(false);
    }
  }

  async function downloadWord(includeAnswers: boolean) {
    if (busyRef.current || !activeBook || committedPendingId !== null) return;
    busyRef.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const file = await fetchSavedBookDocx(activeBook.id, includeAnswers);
      const address = URL.createObjectURL(file);
      try {
        const link = document.createElement('a');
        link.href = address;
        link.download = 'prolig-kitap-' + activeBook.id + (includeAnswers ? '-cevapli' : '-ogrenci') + '.docx';
        document.body.appendChild(link);
        link.click();
        link.remove();
      } finally {
        URL.revokeObjectURL(address);
      }
      setNotice('Word taslağı hazırlandı. Nihai dizgi ve baskı kabulü yapılmamıştır.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Word belgesi oluşturulamadı.');
    } finally {
      busyRef.current = false; setBusy(false);
    }
  }

  function newDraft() {
    if (busyRef.current || committedPendingId !== null) return;
    if (view.selectedIds.length &&
        !window.confirm('Kaydedilmemiş seçimler silinecek. Yeni kitap hazırlamak istiyor musunuz?')) return;
    setError(''); setNotice('');
    onNew();
  }

  return <section className="panel publishing-persistence" aria-label="Kalıcı kitap taslakları">
    <div className="publishing-panel-heading">
      <div><div className="eyebrow">V2 · YALNIZ İZOLE ÖNİZLEME</div><h2>Kayıtlı Kitaplarım</h2></div>
      <button type="button" className="secondary-button" disabled={listing || busy}
        onClick={() => void refreshRecords()}><RefreshCw size={15}/> Listeyi yenile</button>
    </div>
    <p className="publishing-panel-explanation">Bu alan yalnızca özel test önizlemesinde açılır. Kaydetme işlemleri sadece bu önizlemenin ayrı test veritabanında yapılabilir. Yayınlanmış kitaplar düzenlenemez.</p>
    <p className="publishing-order-intent" role="status">Kaydedilecek soru sırası: <strong>{formatQuestionOrder(view.selectedIds)}</strong>
      {activeBook && <span> · {sameQuestionOrder(view.selectedIds, flattenSingleChapter(activeBook).questionIds)
        ? 'Kayıtlı sırayla aynı' : 'Kayıtlı sıradan farklı'}</span>}
    </p>
    <div className="publishing-persistence-actions">
      <button type="button" className="primary-button" disabled={busy || listing || loading || Boolean(sourceError) || committedPendingId !== null}
        onClick={() => void save()}><Save size={16}/>{activeBook ? 'Değişiklikleri Kaydet' : 'Kitabı Kaydet'}</button>
      <button type="button" className="secondary-button" disabled={busy || committedPendingId !== null} onClick={newDraft}>Yeni kitap taslağı</button>
      {committedPendingId !== null && <button type="button" className="secondary-button" disabled={busy}
        onClick={() => void recoverCommitted()}>Kayıtlı Sürümü İncele #{committedPendingId}</button>}
      {activeBook && <>
        <button type="button" className="secondary-button"
          disabled={busy || committedPendingId !== null || activeBook.layoutColumns !== 1}
          title={activeBook.layoutColumns !== 1 ? 'Word V1 yalnız tek sütunlu kitapları destekler.' : 'Kayıtlı öğrenci nüshasını Word olarak al'}
          onClick={() => void downloadWord(false)}><Download size={15}/> Öğrenci Word</button>
        <button type="button" className="secondary-button"
          disabled={busy || committedPendingId !== null || activeBook.layoutColumns !== 1}
          title={activeBook.layoutColumns !== 1 ? 'Word V1 yalnız tek sütunlu kitapları destekler.' : 'Kayıtlı cevap anahtarlı nüshayı Word olarak al'}
          onClick={() => void downloadWord(true)}><Download size={15}/> Cevap Anahtarlı Word</button>
        <span className="publishing-revision">#{activeBook.id} · Revizyon {activeBook.revision} · {activeBook.status}</span>
      </>}
    </div>
    {activeBook && <p className="publishing-word-note" role="note">Word çıktısı yalnızca kaydedilmiş, tek sütunlu kitap taslağından üretilir. İzole P3 ortamında soruya bağlı özel PNG çizimleri desteklenir; harici medya ve desteklenmeyen matematik dizgisi engellenir. Dosya ekrandaki kaydedilmemiş değişiklikleri içermez.</p>}
    {listing && <p role="status">Kayıtlı kitaplar yükleniyor…</p>}
    {error && <p role="alert" className="publishing-error">{error}</p>}
    {notice && <p role="status" className="publishing-success">{notice}</p>}
    {!listing && !error && records.length === 0 && <p className="publishing-empty">Henüz kayıtlı kitap taslağınız bulunmuyor.</p>}
    <div className="publishing-saved-list">
      {records.map(book => <div key={book.id} className="publishing-saved-book">
        <div><strong>{book.title}</strong><small>#{book.id} · {book.status} · Sürüm {book.revision}</small></div>
        <button type="button" className="secondary-button" disabled={busy}
          onClick={() => void open(book.id)}><BookOpen size={14}/> Taslağı Düzenle</button>
      </div>)}
    </div>
  </section>;
}
