export const QUESTION_TYPES = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'OPEN_ENDED'] as const;
export type QuestionType = typeof QUESTION_TYPES[number];
export const questionTypeLabels: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: 'Çoktan Seçmeli', TRUE_FALSE: 'Doğru / Yanlış', OPEN_ENDED: 'Klasik / Açık Uçlu'
};
export interface QuestionTypeFields {
  questionType?: QuestionType;
  optionCount?: number | null;
  booleanAnswer?: boolean | null;
  modelAnswer?: string | null;
  scoringRubric?: string | null;
  evaluationCriteria?: string | null;
}
export function allowsFiveOptions(grade: string | null | undefined): boolean {
  return ['9. Sınıf', '10. Sınıf', '11. Sınıf', '12. Sınıf', 'Mezun'].includes(grade?.trim() ?? '');
}
export const questionTypeFieldNames = ['questionType', 'optionCount', 'booleanAnswer', 'modelAnswer', 'scoringRubric', 'evaluationCriteria'] as const;

/** Flat canonical API contract; non-MCQ questions never have fake choices. */
export function validateQuestionAnswerStructure(input: Record<string, unknown>, complete = false): string | null {
  const type = input.questionType;
  if (!QUESTION_TYPES.includes(type as QuestionType)) return 'Geçerli bir soru türü seçin.';
  if (!Array.isArray(input.options) || !input.options.every(x => typeof x === 'string' && x.trim().length <= 500)) return 'Seçenekler en fazla 500 karakterlik metinlerden oluşmalı.';
  for (const key of ['modelAnswer', 'scoringRubric', 'evaluationCriteria']) {
    const value = input[key];
    if (value !== undefined && value !== null && (typeof value !== 'string' || value.trim().length > 2000)) return 'Model cevap ve değerlendirme alanları en fazla 2000 karakter olmalı.';
  }
  if (type === 'MULTIPLE_CHOICE') {
    const count = input.optionCount;
    if (count !== 4 && count !== 5) return 'Çoktan seçmeli soruda 4 veya 5 seçenek olmalı.';
    if (count === 5 && !allowsFiveOptions(input.grade as string)) return 'Beş seçenek yalnızca lise ve mezun düzeyinde kullanılabilir.';
    if (input.options.length !== count) return 'Seçenek sayısı soru yapılandırmasıyla eşleşmiyor.';
    if (!['A', 'B', 'C', 'D', 'E'].slice(0, count).includes(input.correctAnswer as string)) return 'Geçerli doğru cevabı seçin.';
    if (complete && input.options.some(x => !x.trim())) return 'İncelemeye göndermeden önce tüm seçenekleri doldurun.';
    if (input.booleanAnswer != null || ['modelAnswer', 'scoringRubric', 'evaluationCriteria'].some(key => input[key] != null && input[key] !== '')) return 'Çoktan seçmeli soruya başka bir türün cevap alanları eklenemez.';
  } else {
    if (input.options.length || input.correctAnswer != null || input.optionCount != null) return 'Bu soru türünde seçenek ve A–E cevap kodu kullanılamaz.';
    if (type === 'TRUE_FALSE') {
      if (typeof input.booleanAnswer !== 'boolean') return 'Doğru veya Yanlış cevap anahtarını seçin.';
      if (['modelAnswer', 'scoringRubric', 'evaluationCriteria'].some(key => input[key] != null && input[key] !== '')) return 'Doğru/Yanlış sorusunda klasik cevap alanları kullanılamaz.';
    } else {
      if (input.booleanAnswer != null) return 'Klasik soruda otomatik Doğru/Yanlış anahtarı kullanılamaz.';
      if (complete && (typeof input.modelAnswer !== 'string' || !input.modelAnswer.trim())) return 'İncelemeye göndermeden önce model cevabı doldurun.';
    }
  }
  if (complete && (typeof input.content !== 'string' || input.content.trim().length < 10)) return 'Soru kökü en az 10 karakter olmalı.';
  return null;
}
