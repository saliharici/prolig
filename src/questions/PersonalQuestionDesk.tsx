import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, FileDown, FileQuestion, Plus, X } from 'lucide-react';
import type { ApiQuestion } from './types';

type Props = {
  questions: ApiQuestion[];
  loading: boolean;
  error: string;
  onCreate: () => void;
  onEdit: (question: ApiQuestion) => void;
};

const MAX_EXPORT = 50;

export function PersonalQuestionDesk({ questions, loading, error, onCreate, onEdit }: Props) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [title, setTitle] = useState('Kişisel Soru Setim');
  const [includeAnswers, setIncludeAnswers] = useState(true);
  const [search, setSearch] = useState('');
  const [grade, setGrade] = useState('');
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');

  // Only the signed-in author's API-scoped records reach this component.
  // "Unassigned" does not imply server-enforced privacy for old pool records.
  const eligible = useMemo(() => questions.filter(question =>
    question.projectId === null && (question.taskId ?? null) === null &&
    question.status === 'TASLAK' && !question.isArchived
  ), [questions]);
  const byId = useMemo(() => new Map(eligible.map(question => [question.id, question])), [eligible]);
  const grades = useMemo(() => [...new Set(eligible.map(question => question.grade).filter((value): value is string => Boolean(value)))].sort(), [eligible]);
  const listed = useMemo(() => eligible.filter(question =>
    (!grade || question.grade === grade) &&
    (!search || [question.content, question.objectiveCode ?? '', question.grade ?? '']
      .join(' ').toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR')))
  ), [eligible, grade, search]);
  useEffect(() => {
    setSelectedIds(previous => previous.filter(id => byId.has(id)));
  }, [byId]);

  const toggle = (id: number) => {
    setMessage('');
    setSelectedIds(previous => previous.includes(id)
      ? previous.filter(value => value !== id)
      : previous.length >= MAX_EXPORT ? previous : [...previous, id]);
  };
  const move = (index: number, direction: number) => {
    const to = index + direction;
    if (to < 0 || to >= selectedIds.length) return;
    setSelectedIds(previous => {
      const copy = [...previous];
      [copy[index], copy[to]] = [copy[to], copy[index]];
      return copy;
    });
  };

  const exportWord = async () => {
    if (exporting || !selectedIds.length) return;
    setExporting(true);
    setMessage('');
    try {
      const response = await fetch('/api/v1/questions?export=personalDocx', {
        method: 'POST', credentials: 'include', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), questionIds: selectedIds, includeAnswers })
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Word belgesi hazırlanamadı.');
      }
      const blob = await response.blob();
      if (!blob.size) throw new Error('Sunucudan boş Word belgesi geldi.');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'PRO-LIG-Kisisel-Soru-Seti.docx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      setMessage('Word dosyanız hazırlandı. İndirmeler klasörünüzü kontrol edin.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Word oluşturulamadı.');
    } finally {
      setExporting(false);
    }
  };

  return <section className="panel personal-question-desk" aria-label="Yazar Masası kişisel Word çalışması">
    <div className="personal-desk-head">
      <div>
        <span className="panel-kicker">RELEASE-05 · YAZAR MASASI</span>
        <h2>Kişisel soru çalışmam</h2>
        <p>Projeye veya göreve bağlı olmayan kendi taslaklarınızı seçin; düzenlenebilir Word çalışma kâğıdı oluşturun.</p>
      </div>
      <button type="button" className="primary-button" onClick={onCreate}><Plus size={16}/> Yeni soru</button>
    </div>
    <p className="personal-desk-scope" role="note">
      Bu ilk sürüm mevcut genel havuz kayıtlarını kullanır; projeye bağlı olmayan eski sorular henüz gizli soru statüsünde değildir.
      Word indirme yalnız kendi taslaklarınıza açıktır. Yayınevine gönderim, editör onayı ve telif işlemi yapılmaz.
    </p>
    <div className="personal-desk-columns">
      <div>
        <div className="personal-desk-tools">
          <input aria-label="Kişisel sorularda ara" value={search} onChange={event => setSearch(event.target.value)}
            placeholder="Soru veya kazanım ara..." />
          <select aria-label="Sınıf filtresi" value={grade} onChange={event => setGrade(event.target.value)}>
            <option value="">Tüm sınıflar</option>
            {grades.map(value => <option key={value}>{value}</option>)}
          </select>
        </div>
        {loading && <p>Sorular yükleniyor…</p>}
        {error && <p role="alert">{error}</p>}
        {!loading && !error && listed.length === 0 && <p className="personal-desk-empty">
          <FileQuestion size={18}/> Uygun taslak bulunamadı. Yeni soru oluştururken proje seçimini boş bırakın.
        </p>}
        {!loading && !error && <div className="personal-desk-list" role="group" aria-label="Word için soru seçimi">
          {listed.map(question => <div className="personal-desk-question" key={question.id}>
            <label>
              <input type="checkbox" checked={selectedIds.includes(question.id)}
                disabled={!selectedIds.includes(question.id) && selectedIds.length >= MAX_EXPORT}
                onChange={() => toggle(question.id)}/>
              <span className="personal-desk-question-copy"><strong>#{question.id} · {question.grade || 'Sınıf belirtilmedi'}</strong>
                <span>{question.content}</span></span>
            </label>
            <button type="button" className="secondary-button" onClick={() => onEdit(question)}>Düzenle</button>
          </div>)}
        </div>}
      </div>
      <div className="personal-desk-export">
        <h3>Word soru seti <small>{selectedIds.length}/{MAX_EXPORT} soru</small></h3>
        <label>Belge başlığı
          <input value={title} maxLength={120} onChange={event => setTitle(event.target.value)} />
        </label>
        <label className="personal-desk-checkbox"><input type="checkbox" checked={includeAnswers}
          onChange={event => setIncludeAnswers(event.target.checked)}/> Cevap anahtarı ekle</label>
        <div className="personal-desk-selection" aria-live="polite">
          {selectedIds.map((id, index) => <div key={id}>
            <span>{index + 1}. <strong>#{id}</strong> · {byId.get(id)?.grade || 'Sınıf belirtilmedi'}</span>
            <div>
              <button aria-label={`#${id} yukarı taşı`} type="button" disabled={index===0} onClick={()=>move(index,-1)}><ArrowUp size={14}/></button>
              <button aria-label={`#${id} aşağı taşı`} type="button" disabled={index===selectedIds.length-1} onClick={()=>move(index,1)}><ArrowDown size={14}/></button>
              <button aria-label={`#${id} seçimden çıkar`} type="button" onClick={()=>toggle(id)}><X size={14}/></button>
            </div>
          </div>)}
          {!selectedIds.length && <p>Word'e aktarılacak soruları soldan seçin.</p>}
        </div>
        <button type="button" className="primary-button" disabled={exporting || loading || Boolean(error) ||
          !selectedIds.length || title.trim().length < 3} onClick={() => void exportWord()}>
          <FileDown size={17}/> {exporting ? 'Word hazırlanıyor…' : 'Word dosyası oluştur'}
        </button>
        {message && <p className="personal-desk-message" role="status">{message}</p>}
        <small>Medya veya desteklenmeyen formül içeren sorular eksik belge üretmek yerine açıklayıcı hata verir.</small>
      </div>
    </div>
  </section>;
}
