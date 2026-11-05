import { useEffect, useState } from 'react';
import type { QuestionStudioFormValues } from './studio-state';
import { applyAiReviewEdit, type AiReviewEdit, type AiReviewReport } from '../../shared/ai-editor-contract';
import './ai-question-review.css';

const categories: Record<string, string> = {
  academic: 'Akademik doğruluk', answer_key: 'Cevap anahtarı', language: 'Dil ve anlatım',
  distractors: 'Çeldirici kalitesi', mathematics: 'Matematiksel ifadeler',
  geometry: 'Geometri görselleri'
};
const severityLabels: Record<string,string> = {
  critical: 'Kritik', major: 'Önemli', minor: 'Küçük', info: 'Bilgi'
};
function draftValue(values: QuestionStudioFormValues, field: AiReviewEdit['field']) {
  if (field === 'content') return values.content;
  if (field === 'explanation') return values.explanation;
  return values.options['ABCDE'.indexOf(field.slice(-1))] || '';
}
export function AiQuestionReviewPanel({ questionId, expectedUpdatedAt, values, onChange, disabled, onStepChange }: {
  questionId: number; expectedUpdatedAt: string;
  values: QuestionStudioFormValues;
  onChange: (values: QuestionStudioFormValues) => void;
  disabled: boolean; onStepChange: (step: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [report, setReport] = useState<AiReviewReport | null>(null);
  const [snapshot, setSnapshot] = useState('');
  useEffect(() => { setReport(null); setError(''); setNotice(''); setSnapshot(''); },
    [questionId, expectedUpdatedAt]);

  const currentSnapshot = JSON.stringify([values.content, values.options, values.explanation,
    values.correctAnswer, values.booleanAnswer, values.modelAnswer]);
  const stale = Boolean(report && snapshot !== currentSnapshot);

  async function review() {
    if (busy || disabled) return;
    setBusy(true); setError(''); setNotice(''); setReport(null);
    const initialSnapshot = currentSnapshot;
    try {
      const response = await fetch('/api/v1/questions/' + questionId + '/ai-review', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedUpdatedAt })
      });
      const data = await response.json().catch(() => ({})) as {
        report?: AiReviewReport; error?: string
      };
      if (!response.ok) throw new Error(data.error || 'AI incelemesi tamamlanamadı.');
      if (!data.report || data.report.advisoryOnly !== true ||
          !Array.isArray(data.report.issues) || data.report.reviewedUpdatedAt !== new Date(expectedUpdatedAt).toISOString())
        throw new Error('AI yanıtı doğrulanamadı.');
      setReport(data.report); setSnapshot(initialSnapshot);
    } catch (e) { setError(e instanceof Error ? e.message : 'AI incelemesi tamamlanamadı.'); }
    finally { setBusy(false); }
  }

  function apply(edit: AiReviewEdit) {
    if (disabled || stale || busy || !report) return;
    const original = draftValue(values, edit.field);
    const next = applyAiReviewEdit(original, edit);
    if (next === null) {
      setError('Öneri mevcut metinle güvenli biçimde eşleşmiyor. Elle düzenleyin.');
      return;
    }
    if (!window.confirm('Öneri yalnızca açık TASLAĞA uygulansın mı? Kayda geçmesi için ayrıca Kaydet yapmanız gerekir.')) return;
    if (edit.field === 'content') onChange({ ...values, content: next });
    else if (edit.field === 'explanation') onChange({ ...values, explanation: next });
    else {
      const index = 'ABCDE'.indexOf(edit.field.slice(-1));
      if (index < 0 || index >= values.options.length) return;
      const options = [...values.options]; options[index] = next;
      onChange({ ...values, options });
    }
    setReport(null); setSnapshot(''); setError('');
    setNotice('Öneri yalnızca yerel taslağa uygulandı. Kaydetmeden önce inceleyin.');
    onStepChange(edit.field === 'explanation' ? 4 : 2);
  }
  return <section className="release08-ai-panel" aria-label="Yapay zekâ ile soru inceleme">
    <div className="release08-ai-heading">
      <div><strong>AI Editor 1.0</strong>
        <small>Akademik ve editoryal öneriler · otomatik kayıt veya onay yok</small></div>
      <button type="button" className="secondary-button" disabled={disabled || busy}
        onClick={() => void review()}>{busy ? 'İnceleniyor…' : '🤖 Yapay Zekâ ile İncele'}</button>
    </div>
    <p className="release08-ai-disclosure">Kayıtlı sorunun metni ve cevapları AI sağlayıcısına iletilir.
      Kaydedilmemiş değişiklikler bu incelemeye dahil değildir. Öneriler bilimsel doğruluk garantisi değildir.</p>
    {error && <p role="alert" className="release08-ai-error">{error}</p>}
    {notice && <p role="status" className="release08-ai-notice">{notice}</p>}
    {stale && <p role="status" className="release08-ai-notice">Taslak değişti; önceki AI raporu güncel değil.
      Yeni inceleme yapmadan öneri uygulanamaz.</p>}
    {report && <div className="release08-ai-results" aria-live="polite">
      <h3>İnceleme raporu</h3>
      <p>{report.summary}</p>
      <small>Model: {report.model} · yalnızca öneri; insan editör kararı gereklidir.</small>
      {report.issues.length === 0 ? <p>Belirgin sorun bildirilmedi. Bu bir otomatik onay değildir.</p> :
        <ol>{report.issues.map((issue, index) => <li key={index}>
          <div className="release08-ai-tags"><span>{categories[issue.category] || issue.category}</span>
            <span className={'severity-' + issue.severity}>{severityLabels[issue.severity] || issue.severity}</span>
            <span>{issue.expert === 'question_reviewer' ? 'Soru incelemesi' : 'Editoryal değerlendirme'}</span></div>
          <p><strong>Tespit:</strong> {issue.explanation}</p>
          <p><strong>Öneri:</strong> {issue.suggestion}</p>
          {issue.edit && !stale && <button className="secondary-button" type="button"
            disabled={disabled || busy} onClick={() => apply(issue.edit!)}>
              Öneriyi taslağa uygula (onay gerekli)
            </button>}
        </li>)}</ol>}
    </div>}
  </section>;
}
