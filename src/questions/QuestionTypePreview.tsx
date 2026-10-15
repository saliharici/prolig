import type { ReactNode } from 'react';
import { questionTypeLabels, type QuestionTypeFields } from '../../shared/question-contract';
import type { QuestionAssetPlacement } from './types';
import { StudioDocumentPreview, StudioMarkup } from './StudioDocumentPreview';
import { legacyQuestionToStudioDocument } from './studio-document';

export function QuestionTypePreview({ question, renderAssets }: {
  question: QuestionTypeFields & { content: string; options: string[] | null; correctAnswer: string | null; explanation?: string | null };
  renderAssets?: (placement: QuestionAssetPlacement) => ReactNode;
}) {
  const type = question.questionType ?? 'MULTIPLE_CHOICE';
  if (type === 'MULTIPLE_CHOICE') return <StudioDocumentPreview document={legacyQuestionToStudioDocument({
    ...question, options: (question.options ?? []).slice(0, question.optionCount ?? 4)
  })} renderAssets={renderAssets} previewNote={`${questionTypeLabels[type]} · ${question.optionCount ?? 4} seçenek`} />;
  return <article className="question-preview-card studio-p1-preview" aria-label="Soru türüne uygun önizleme">
    <div className="studio-preview-note">{questionTypeLabels[type]}</div>
    <StudioMarkup value={question.content} />{renderAssets?.('STEM')}
    {type === 'TRUE_FALSE' ? <p className="p2-answer-key">Cevap anahtarı: <strong>{question.booleanAnswer === true ? 'Doğru' : question.booleanAnswer === false ? 'Yanlış' : 'Seçilmedi'}</strong></p> : <>
      <section aria-label="Model cevap"><h3>Beklenen / model cevap</h3><StudioMarkup value={question.modelAnswer || 'Henüz hazırlanmadı.'} /></section>
      {question.scoringRubric && <section aria-label="Puanlama anahtarı"><h3>Puanlama anahtarı</h3><StudioMarkup value={question.scoringRubric} /></section>}
      {question.evaluationCriteria && <section aria-label="Değerlendirme ölçütleri"><h3>Değerlendirme ölçütleri</h3><StudioMarkup value={question.evaluationCriteria} /></section>}
    </>}
    {(question.explanation || renderAssets) && <section aria-label="Çözüm"><h3>{type === 'TRUE_FALSE' ? 'Gerekçe' : 'Çözüm'}</h3><StudioMarkup value={question.explanation || ''} />{renderAssets?.('EXPLANATION')}</section>}
  </article>;
}
