import type { ApiQuestion } from '../questions/types';

/** V1 is an in-browser proof. Neither these IDs nor their order are persisted. */
export function approvedForPublishing(questions: ReadonlyArray<ApiQuestion>): ApiQuestion[] {
  return questions.filter(question =>
    question.status === 'ONAYLANDI' &&
    !question.isArchived &&
    typeof question.id === 'number' &&
    Number.isSafeInteger(question.id) &&
    question.id > 0
  );
}

export function resolveBookOrder(
  available: ReadonlyArray<ApiQuestion>,
  orderedIds: ReadonlyArray<number>
): ApiQuestion[] {
  const byId = new Map(approvedForPublishing(available).map(question => [question.id, question]));
  const seen = new Set<number>();
  const result: ApiQuestion[] = [];
  for (const id of orderedIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const question = byId.get(id);
    if (question) result.push(question);
  }
  return result;
}

export function moveBookQuestion(ids: ReadonlyArray<number>, id: number, delta: -1 | 1): number[] {
  const moved = [...ids];
  const index = moved.indexOf(id);
  const next = index + delta;
  if (index < 0 || next < 0 || next >= moved.length) return moved;
  [moved[index], moved[next]] = [moved[next], moved[index]];
  return moved;
}

export function bookAnswer(question: ApiQuestion): string {
  const type = question.questionType || 'MULTIPLE_CHOICE';
  if (type === 'TRUE_FALSE') {
    return question.booleanAnswer === true ? 'Doğru' :
      question.booleanAnswer === false ? 'Yanlış' : 'Cevap girilmemiş';
  }
  if (type === 'OPEN_ENDED') return question.modelAnswer?.trim() || 'Model cevap girilmemiş';
  return question.correctAnswer?.trim() || 'Cevap girilmemiş';
}

/** Unsupported media must be signalled, not quietly treated as print-ready. */
export function bookMediaWarnings(questions: ReadonlyArray<ApiQuestion>): string[] {
  const warnings: string[] = [];
  if (questions.some(q => q.assets?.some(asset => asset.assetType !== 'IMAGE'))) {
    warnings.push('Video veya bağlantı ekleri baskı çıktısına gömülmez; kaynakları ayrıca kontrol edin.');
  }
  if (questions.some(q => /\\\(|\\\[|\\frac|\\sqrt|\$\$/.test(q.content + ' ' + (q.explanation ?? '')))) {
    warnings.push('Matematik ifadeleri kaynak TeX metni olarak kalabilir; baskı öncesi dizgiyi kontrol edin.');
  }
  return warnings;
}
