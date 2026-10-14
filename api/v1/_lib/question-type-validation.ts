import { questionTypeFieldNames, validateQuestionAnswerStructure } from '../../../shared/question-contract.js';

export function usesTypedQuestion(body: any, existing?: any): boolean {
  return existing?.questionType != null || questionTypeFieldNames.some(key => body?.[key] !== undefined);
}

export function parseTypedQuestion(body: any, existing?: any) {
  if (process.env.PROLIG_QUESTION_TYPES_P2 !== 'true') return { error: 'P2 soru türleri bu ortamda etkin değil.', status: 403 };
  const type = body.questionType ?? existing?.questionType ?? 'MULTIPLE_CHOICE';
  const oldType = existing?.questionType ?? 'MULTIPLE_CHOICE';
  const oldCount = oldType === 'MULTIPLE_CHOICE' ? existing?.optionCount ?? 4 : null;
  if (existing && ((body.questionType !== undefined && body.questionType !== oldType) ||
      (body.optionCount !== undefined && body.optionCount !== oldCount))) {
    return { error: 'Kaydedilmiş sorunun türü ve seçenek sayısı değiştirilemez. Yeni taslak oluşturun.', status: 409 };
  }
  const effective = {
    options: [], correctAnswer: null, booleanAnswer: null, modelAnswer: null,
    scoringRubric: null, evaluationCriteria: null,
    ...existing, ...body, questionType: body.questionType === null ? null : type,
    optionCount: body.optionCount !== undefined ? body.optionCount : existing?.optionCount ?? (type === 'MULTIPLE_CHOICE' ? 4 : null)
  };
  const error = validateQuestionAnswerStructure(effective);
  if (error) return { error, status: 400 };
  const data: Record<string, any> = {
    questionType: effective.questionType, optionCount: effective.optionCount,
    options: effective.options.map((x: string) => x.trim()), correctAnswer: effective.correctAnswer,
    booleanAnswer: effective.booleanAnswer
  };
  for (const key of ['modelAnswer', 'scoringRubric', 'evaluationCriteria']) data[key] = effective[key]?.trim() || null;
  return { data };
}
