import { useEffect, useRef, useState, type ReactNode } from 'react';
import { allowsFiveOptions, questionTypeLabels, type QuestionType } from '../../shared/question-contract';
import type { ApiProject } from '../projects/types';
import type { QuestionAssetPlacement, QuestionAssetType } from './types';
import type { QuestionStudioFormValues } from './studio-state';
import { switchQuestionType } from './question-type-state';
import { QuestionStemWysiwygEditor } from './QuestionStemWysiwygEditor';
import { QuestionTypePreview } from './QuestionTypePreview';
import { PrivateGeometryWorkspace, type PrivateGeometryPreviewImage } from './PrivateGeometryWorkspace';
import './guided-question-studio.css';

const steps = ['Tür ve bilgiler', 'Soru ve seçenekler', 'Cevap anahtarı', 'Çözüm ve değerlendirme', 'Önizleme ve kayıt'];
const editorHints = {
  content: 'Sorunun yönergesini ve içeriğini yazın...',
  explanation: 'Cevabın gerekçesini ve çözüm adımlarını yazın...',
  modelAnswer: 'Beklenen örnek cevabı ve çözüm yaklaşımını yazın...',
  scoringRubric: 'Puan dağılımını ve puanlama anahtarını yazın...',
  evaluationCriteria: 'Yanıtın değerlendirileceği ölçütleri yazın...'
} as const;
export function guidedQuestionIssues(v: QuestionStudioFormValues) {
  const issues: { step: number; message: string }[] = [];
  if (!v.grade) issues.push({ step: 1, message: 'Sınıf seçin.' });
  if (v.questionType === 'MULTIPLE_CHOICE' && v.optionCount === 5 && !allowsFiveOptions(v.grade)) issues.push({ step: 1, message: 'Beş seçenek için lise veya mezun sınıfı seçin.' });
  if (v.content.trim().length < 10 || v.content.length > 1200) issues.push({ step: 2, message: 'Soru kökü 10–1200 karakter olmalı.' });
  if (v.questionType === 'MULTIPLE_CHOICE') {
    const count = v.optionCount ?? 4;
    if (v.options.slice(0, count).length !== count || v.options.slice(0, count).some(x => !x.trim() || x.length > 500)) issues.push({ step: 3, message: 'İnceleme için tüm seçenekleri doldurun (en fazla 500 karakter).' });
    if (!'ABCDE'.slice(0, count).split('').includes(v.correctAnswer)) issues.push({ step: 3, message: 'Doğru cevabı seçin.' });
  }
  if (v.questionType === 'TRUE_FALSE' && typeof v.booleanAnswer !== 'boolean') issues.push({ step: 3, message: 'Doğru veya Yanlış anahtarını seçin.' });
  if (v.questionType === 'OPEN_ENDED' && !v.modelAnswer?.trim()) issues.push({ step: 4, message: 'İncelemeye göndermeden önce model cevabı hazırlayın.' });
  if (v.explanation.length > 600 || [v.modelAnswer, v.scoringRubric, v.evaluationCriteria].some(x => (x?.length ?? 0) > 2000)) issues.push({ step: 4, message: 'Çözüm veya değerlendirme alanının karakter sınırını aşmayın.' });
  return issues;
}

export function GuidedQuestionStudio({ values: v, onChange, step, onStepChange, projects, projectsLoading, projectsError,
  originalProjectId, levels, grades, onProject, onLevel, onGrade, branchName, editing, disabled, sandbox,
  onAddAsset, onRemoveAsset, renderAssets, privateGeometryQuestionId, privateGeometryUpdatedAt, onPrivateGeometryRevision, privateGeometryEnabled
}: {
  values: QuestionStudioFormValues; onChange: (values: QuestionStudioFormValues) => void;
  step: number; onStepChange: (step: number) => void;
  projects: ApiProject[]; projectsLoading: boolean; projectsError: string;
  originalProjectId: number | null; levels: string[]; grades: string[];
  onProject: (value: string) => void; onLevel: (value: string) => void; onGrade: (value: string) => void;
  branchName: string; editing: boolean; disabled: boolean; sandbox: boolean;
  onAddAsset: (placement: QuestionAssetPlacement) => void; onRemoveAsset: (index: number) => void;
  renderAssets: (placement: QuestionAssetPlacement) => ReactNode;
  privateGeometryQuestionId?: number | null;
  privateGeometryEnabled?: boolean;
  privateGeometryUpdatedAt?: string;
  onPrivateGeometryRevision?: (updatedAt: string) => void;
}) {
  const [activeOption, setActiveOption] = useState(0);
  const [preview, setPreview] = useState(true);
  const [previewMode, setPreviewMode] = useState<'student' | 'editor' | 'publish'>('student');
  const [privateStemImage, setPrivateStemImage] = useState<{ questionId: number; image: PrivateGeometryPreviewImage } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  const count = v.optionCount ?? 4;
  const type = v.questionType ?? 'MULTIPLE_CHOICE';
  const letters = 'ABCDE'.slice(0, count).split('');
  const selectedOption = Math.min(activeOption, count - 1);
  const issues = guidedQuestionIssues(v);
  const readyStageCount = [1, 2, 3, 4].filter(index => !issues.some(issue => issue.step === index)).length;
  const activeIssues = issues.filter(issue => issue.step === step);
  const change = (patch: Partial<QuestionStudioFormValues>) => onChange({ ...v, ...patch });
  // Private image bytes live only in the authenticated author workspace.
  // Never store a data URL or S3 key in the question payload or public media.
  const renderPreviewAssets = (placement: QuestionAssetPlacement) => <>
    {renderAssets(placement)}
    {placement === 'STEM' && privateStemImage?.questionId === privateGeometryQuestionId &&
      <figure className="p3-private-stem-preview" aria-label="Soru köküne bağlı özel PNG">
        <img
          src={privateStemImage.image.dataUrl}
          width={privateStemImage.image.width}
          height={privateStemImage.image.height}
          alt="Soru köküne bağlı özel çizim"
        />
        <figcaption>Özel çizim · soru köküne bağlı</figcaption>
      </figure>}
  </>;
  useEffect(() => {
    if (previousStep.current !== step) heading.current?.focus();
    previousStep.current = step;
  }, [step]);
  const changeType = (next: QuestionType) => {
    if (editing || next === type) return;
    if ((v.options.some(x => x.trim()) || v.modelAnswer || v.scoringRubric || v.evaluationCriteria || v.booleanAnswer != null) &&
        !window.confirm('Tür değiştirilsin mi? Önceki cevap alanları bu yerel taslakta korunur; geri dönerek erişebilirsiniz. Sunucuya yalnızca seçilen türün cevap alanları kaydedilir.')) return;
    onChange(switchQuestionType(v, next));
  };
  const media = (placement: QuestionAssetPlacement) => <details className="p2-media p3-media-workspace"><summary>Görsel ve medya araçları <span className="p3-media-count">{v.assets.filter(a => a.placement === placement).length} içerik</span></summary><p className="p3-media-help">Görsel bağlantısını, açıklamasını ve yerleşimini tanımlayın. Yayın çıktısı uyumluluğu ayrıca kontrol edilir.</p>
    <div className="p2-field-grid">
      <label>Medya türü<select value={v.assetType} onChange={e => change({ assetType: e.target.value as QuestionAssetType })}><option value="IMAGE">Görsel</option><option value="VIDEO_URL">Video</option><option value="LINK">Bağlantı</option></select></label>
      <label>Bağlantı<input type="url" value={v.assetUrl} onChange={e => change({ assetUrl: e.target.value })} placeholder="https://…" /></label>
      <label>Başlık<input value={v.assetTitle} maxLength={120} onChange={e => change({ assetTitle: e.target.value })} /></label>
      <label>Görsel açıklaması<input value={v.assetAltText} maxLength={240} onChange={e => change({ assetAltText: e.target.value })} /></label>
    </div><button type="button" className="secondary-button" onClick={() => onAddAsset(placement)}>Medya ekle</button>
    {v.assets.map((a, i) => a.placement === placement && <div className="p2-media-item" key={`${a.url}-${i}`}><span>{a.title || a.url}</span><button type="button" onClick={() => onRemoveAsset(i)} aria-label={`${a.title || 'Medya'} kaldır`}>Kaldır</button></div>)}
  </details>;
  const editor = (field: 'content' | 'explanation' | 'modelAnswer' | 'scoringRubric' | 'evaluationCriteria', label: string, maxLength: number) => <div className="p2-rich-field"><label>{label}</label><QuestionStemWysiwygEditor key={field} value={v[field] || ''} onChange={value => change({ [field]: value })} ariaLabel={label} placeholder={editorHints[field]} maxLength={maxLength} disabled={disabled} variant={field === 'content' ? 'stem' : 'explanation'} /></div>;
  return <section className="p2-guided p3-studio-shell" aria-label="Beş aşamalı soru hazırlama" inert={disabled}>
    <header className="p3-studio-identity"><div><span className="p3-studio-eyebrow">PRO-LIG / YAZAR ÇALIŞMA ALANI</span><h2>Profesyonel Soru Stüdyosu</h2><p>Soru bilgilerini tamamlayın, içeriği hazırlayın ve editör incelemesine hazır hâle getirin.</p></div><span className="p3-studio-status" role="status">{editing ? "Soruyu düzenliyorsunuz" : "Yeni soru taslağı"}</span></header>
    <nav aria-label="Soru hazırlama aşamaları" className="p2-steps">{steps.map((label, i) => <button type="button" key={label} aria-current={step === i + 1 ? 'step' : undefined} onClick={() => onStepChange(i + 1)}><span>{i + 1}</span><strong>{label}</strong><small>{issues.some(x => x.step === i + 1) ? 'Eksik alan' : i < 4 ? 'Hazır' : 'Kontrol et'}</small></button>)}</nav>
    <div className="p2-progress-summary" role="status" aria-live="polite">
      <div>
        <strong>{readyStageCount}/4 içerik aşaması inceleme için hazır</strong>
        <span>{issues.length === 0 ? 'Zorunlu alanlar tamamlandı.' : `${issues.length} kontrol maddesi tamamlanacak.`}</span>
      </div>
      <progress max={4} value={readyStageCount} aria-label="İnceleme hazırlığı" />
    </div>
    <div className={`p2-guided-body ${preview && step < 5 ? 'with-preview' : ''} ${step === 2 ? 'p3-writing-step' : ''}`}>
      <div className="p2-stage"><div className="p2-stage-heading"><div><small>AŞAMA {step} / 5</small><h3 ref={heading} tabIndex={-1}>{steps[step - 1]}</h3></div>{step < 5 && <button type="button" className="secondary-button" aria-expanded={preview} onClick={() => setPreview(x => !x)}>{preview ? 'Önizlemeyi gizle' : 'Önizlemeyi aç'}</button>}</div>
        {step < 5 && <div className={activeIssues.length ? 'p2-active-checklist has-issues' : 'p2-active-checklist'} aria-label="Bu aşamanın kontrol listesi">
          <strong>{activeIssues.length ? `Bu aşamada ${activeIssues.length} eksik nokta` : 'Bu aşamada zorunlu eksik yok'}</strong>
          {activeIssues.length > 0 && <ul>{activeIssues.map(issue => <li key={issue.message}>{issue.message}</li>)}</ul>}
          <small>Bu gösterge inceleme hazırlığı içindir; taslak kaydetme ve gönderim kuralları değişmez.</small>
        </div>}
        {step === 1 && <>
          <label>Soru türü<select value={type} disabled={editing} onChange={e => changeType(e.target.value as QuestionType)}>{Object.entries(questionTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          {sandbox && type !== 'MULTIPLE_CHOICE' && <p className="p2-notice" role="status">Bu soru türünü beş aşamada önizleyebilirsiniz. Korumalı sandbox kayıt modunda yalnızca dört seçenekli çoktan seçmeli sorular kaydedilebilir.</p>}
          {editing && <p className="field-help">Kaydedilmiş sorunun türü ve seçenek sayısı sabittir. Farklı tür için yeni taslak açın.</p>}
          <div className="p2-field-grid">
            <label>Proje<select value={v.projectId ?? ''} disabled={projectsLoading} onChange={e => onProject(e.target.value)}><option value="">Genel Soru Havuzu</option>{editing && originalProjectId !== null && !projects.some(p => p.id === originalProjectId) && <option value={originalProjectId} disabled>Mevcut proje erişim kapsamında değil</option>}{projects.map(p => <option key={p.id} value={p.id}>{p.code} · {p.title}</option>)}</select></label>
            <label>Branş<input value={projects.find(p => p.id === v.projectId)?.branch.name || branchName} readOnly /></label>
            <label>Eğitim kademesi<select value={v.level} disabled={v.projectId !== null} onChange={e => onLevel(e.target.value)}>{levels.map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Sınıf<select value={v.grade} disabled={v.projectId !== null} onChange={e => onGrade(e.target.value)}>{grades.map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Kazanım kodu<input maxLength={sandbox ? 90 : 100} value={v.objectiveCode || ''} onChange={e => change({ objectiveCode: e.target.value })} /></label>
            <label>Zorluk düzeyi<select value={v.difficulty || ''} onChange={e => change({ difficulty: e.target.value })}><option value="">Belirtilmedi</option>{['Kolay', 'Orta', 'Zor'].map(x => <option key={x}>{x}</option>)}{v.difficulty && !['Kolay', 'Orta', 'Zor'].includes(v.difficulty) && <option>{v.difficulty}</option>}</select></label>
            {type === 'MULTIPLE_CHOICE' && <label>Seçenek sayısı<select value={count} disabled={editing || sandbox} onChange={e => {
              const next = Number(e.target.value);
              if (next < count && v.options[4]?.trim() && !window.confirm('E seçeneği yerel taslakta korunacak; dört seçenekli kayda dahil edilmeyecek. Devam edilsin mi?')) return;
              change({ optionCount: next, options: Array.from({ length: Math.max(next, v.options.length) }, (_, i) => v.options[i] || '') });
            }}><option value={4}>4 seçenek · A–D</option>{!sandbox && <option value={5} disabled={!allowsFiveOptions(v.grade)}>5 seçenek · A–E (Lise / Mezun)</option>}</select></label>}
          </div>
          {v.projectId !== null && <p className="field-help">Sınıf seçilen projenin hedef sınıfına kilitlidir.</p>}
          {projectsError && <p role="alert">Atanmış projeler yüklenemedi: {projectsError}</p>}
          {sandbox && <p className="p2-notice">Korumalı sandbox kaydı: yalnızca PILOT-MAT-8-001 projesinde dört seçenekli çoktan seçmeli sorular. P2-UAT işareti korunur; diğer soru türleri şimdilik salt okunur önizlemededir.</p>}
        </>}
        {step === 2 && <>
          {editor('content', 'Soru kökü', 1200)}
          {privateGeometryEnabled && <section className="p3-private-shape-entry" aria-label="Özel şekil ekle">
            <div className="p3-private-shape-heading">
              <h4>Özel şekil ekle</h4>
              <p>Hazır üçgen, çember ve kare için yukarıdaki <strong>Geometri araçları</strong> bölümünü; kendi çizdiğiniz PNG için aşağıdaki özel çizim alanını kullanın.</p>
            </div>
            {editing && privateGeometryQuestionId && privateGeometryUpdatedAt && onPrivateGeometryRevision
              ? <PrivateGeometryWorkspace questionId={privateGeometryQuestionId}
                  expectedUpdatedAt={privateGeometryUpdatedAt} disabled={disabled}
                  onRevisionChange={onPrivateGeometryRevision}
                  onPreviewChange={image => setPrivateStemImage(
                    image && typeof privateGeometryQuestionId === 'number'
                      ? { questionId: privateGeometryQuestionId, image } : null
                  )} />
              : <div className="p3-private-shape-save-first" role="note">
                  <strong>Özel PNG yüklemesi için önce soru taslağını kaydedin.</strong>
                  <p>Kaydetme işleminden sonra Sorularım listesindeki Düzenle düğmesiyle soruyu yeniden açın. Bu alanda PNG seçme ve soruya bağlama seçenekleri etkinleşecektir.</p>
                  <button type="button" className="secondary-button" disabled={disabled}
                    onClick={() => onStepChange(5)}>Önizleme ve kayıt aşamasına geç</button>
                </div>}
          </section>}
          {media('STEM')}

          {type === 'MULTIPLE_CHOICE' && <section className="p3-integrated-options" aria-label="Soru tasarımı cevap seçenekleri">
            <div className="p3-integrated-options-heading"><h4>Cevap seçenekleri</h4><p>Soru kökünü hazırlarken seçeneklerini aynı çalışma alanında düzenleyin.</p></div>
            <div role="tablist" aria-label="Cevap seçenekleri" className="p2-option-tabs">{letters.map((letter, i) => <button type="button" role="tab" id={`p2-option-${letter}`} aria-controls="p2-option-panel" aria-selected={selectedOption === i} tabIndex={selectedOption === i ? 0 : -1} key={letter} onClick={() => setActiveOption(i)} onKeyDown={e => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
              e.preventDefault();
              const next = e.key === 'Home' ? 0 : e.key === 'End' ? count - 1 : (i + (e.key === 'ArrowRight' ? 1 : count - 1)) % count;
              setActiveOption(next); document.getElementById(`p2-option-${letters[next]}`)?.focus();
            }}>{letter}<small>{v.options[i]?.trim() ? 'Dolu' : 'Boş'}</small></button>)}</div>
            <div role="tabpanel" id="p2-option-panel" aria-labelledby={`p2-option-${letters[selectedOption]}`}><QuestionStemWysiwygEditor key={selectedOption} value={v.options[selectedOption] || ''} onChange={value => change({ options: v.options.map((x, i) => i === selectedOption ? value : x) })} variant="option" ariaLabel={`${letters[selectedOption]} seçeneği`} maxLength={500} disabled={disabled} />{media(`OPTION_${letters[selectedOption]}` as QuestionAssetPlacement)}</div>
          </section>}
        </>}
        {step === 3 && <>
          {type === 'MULTIPLE_CHOICE' ? <>
            <label>Doğru cevap<select value={letters.includes(v.correctAnswer) ? v.correctAnswer : ''} onChange={e => change({ correctAnswer: e.target.value })}><option value="">Seçin</option>{letters.map(x => <option key={x}>{x}</option>)}</select></label>
          </> : type === 'TRUE_FALSE' ? <fieldset className="p2-boolean"><legend>Önermenin doğru cevabı</legend>{[true, false].map(value => <label key={String(value)}><input type="radio" name="p2-boolean-answer" checked={v.booleanAnswer === value} onChange={() => change({ booleanAnswer: value })} />{value ? 'Doğru' : 'Yanlış'}</label>)}</fieldset> : <p className="p2-notice">Klasik soruda seçenek veya otomatik cevap anahtarı kullanılmaz. Bir sonraki aşamada model cevabı ve insan editörün kullanacağı değerlendirme ölçütlerini hazırlayın.</p>}
        </>}
        {step === 4 && <>
          {type === 'OPEN_ENDED' && editor('modelAnswer', 'Beklenen / model cevap', 2000)}
          {editor('explanation', type === 'TRUE_FALSE' ? 'Cevabın gerekçesi' : 'Çözüm ve açıklama', 600)}{media('EXPLANATION')}
          {type === 'OPEN_ENDED' && <>{editor('scoringRubric', 'Puanlama anahtarı (isteğe bağlı)', 2000)}{editor('evaluationCriteria', 'Değerlendirme ölçütleri (isteğe bağlı)', 2000)}</>}
        </>}
        {step === 5 && <>
          <section className="p3-revision-workflow" aria-label="Soru revizyon ve kayıt süreci">
            <h4>{editing ? 'Düzenlenen soru · kayıt kontrolü' : 'Yeni soru · taslak kontrolü'}</h4>
            <ol>
              <li><strong>İçerik kontrolü</strong><span>{issues.length ? `${issues.length} zorunlu madde tamamlanmalı.` : 'Zorunlu alan kontrolleri tamamlandı.'}</span></li>
              <li><strong>Değişiklik güvenliği</strong><span>Kaydetmeden önce taslağı kontrol edin. Sunucu sürümü değişmişse sistem üzerine yazmayı engeller.</span></li>
              <li><strong>Editör değerlendirmesi</strong><span>Taslak kaydı editör onayı değildir; soru ayrıca incelemeye gönderilmelidir.</span></li>
              <li><strong>Sürüm geçmişi</strong><span>Bu panel geçmiş sürüm arşivi sunmaz. Kalıcı geçmiş ve geri alma, ayrı veri modeli doğrulaması gerektirir.</span></li>
            </ol>
          </section>
          <QuestionTypePreview question={{ ...v, options: v.options, questionType: type }} renderAssets={renderPreviewAssets} />
          <section className="p2-completion" aria-label="Kayıt öncesi kontrol"><h4>İncelemeye hazırlık</h4>{issues.length ? <ul>{issues.map(x => <li key={x.message}><button type="button" onClick={() => onStepChange(x.step)}>{x.message} → Aşama {x.step}</button></li>)}</ul> : <p>Tüm zorunlu alanlar hazır.</p>}<p>Taslak kaydı incelemeye göndermez. Boş seçenekler ve model cevap taslakta tamamlanabilir; incelemeye gönderimde zorunludur. Cevap anahtarı gerektiren türlerde anahtar seçilmelidir.</p><p>Yalnızca etkin soru türünün cevap alanları kaydedilir. Diğer türlerdeki girişler bu yerel taslakta korunur.</p></section>
        </>}
        <div className="p2-step-actions"><button type="button" className="secondary-button" disabled={step === 1} onClick={() => onStepChange(step - 1)}>Önceki aşama</button>{step < 5 && <button type="button" className="primary-button" onClick={() => onStepChange(step + 1)}>Sonraki aşama →</button>}</div>
      </div>
      {preview && step < 5 && <aside className="p2-live-preview" aria-label="İsteğe bağlı önizleme">
        <div className="p2-live-preview-heading"><strong>Soru inceleme paneli</strong><small>Öğrenci, editör ve yayın görünümü · sadece görüntüleme</small></div>
        <div className="p3-preview-modes" role="group" aria-label="İnceleme görünümünü seç">
          {([['student','Öğrenci'],['editor','Editör'],['publish','Yayın']] as const).map(([mode,label]) =>
            <button type="button" key={mode} aria-pressed={previewMode === mode} onClick={() => setPreviewMode(mode)}>{label}</button>)}
        </div>
        {previewMode === 'student' && <QuestionTypePreview question={{ ...v, questionType: type }} renderAssets={renderPreviewAssets} />}
        {previewMode === 'editor' && <section className="p3-review-summary" aria-label="Editör ön kontrolü">
          <strong>İnceleme hazırlığı</strong>
          <p>{issues.length === 0 ? 'Zorunlu alanlar tamamlandı; pedagojik onay ayrıca gereklidir.' : `${issues.length} zorunlu kontrol maddesi bulunuyor.`}</p>
          {issues.length > 0 && <ul>{issues.map(issue => <li key={issue.message}><button type="button" onClick={() => onStepChange(issue.step)}>{issue.message} → Aşama {issue.step}</button></li>)}</ul>}
          <small>Bu otomatik kontrol kazanım uyumunu, çeldirici kalitesini veya bilimsel doğruluğu onaylamaz.</small>
        </section>}
        {previewMode === 'publish' && <section className="p3-review-summary" aria-label="Yayın teknik ön kontrolü">
          <strong>Word çıktısı ön kontrolü</strong>
          <p>{v.assets.length ? `${v.assets.length} medya öğesi: Word çıktısında destek kontrolü gerekir.` : 'Harici medya öğesi bulunmuyor.'}</p>
          <p>{[v.content, ...v.options, v.explanation || '', v.modelAnswer || ''].some(x => x.includes('$') || x.includes('\\frac') || x.includes('\\sqrt') || x.includes('\\begin')) ? 'Matematik ifadeleri için DOCX motorunda birebir çıktı doğrulaması gerekir.' : 'Belirgin LaTeX işareti bulunmadı; bu bir yayın onayı değildir.'}</p>
          <small>Sayfa taşması, görsel çözünürlüğü ve dizgi uygunluğu yalnız gerçek Word çıktısıyla doğrulanabilir.</small>
        </section>}
      </aside>}
    </div>
  </section>;
}
