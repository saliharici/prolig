import type { ApiQuestion } from './types';
import type { QuestionStudioFormValues } from './studio-state';
import { normalizeQuestionAssets, normalizeQuestionOptions } from './edit';

export interface QuestionRevisionDifference {
  field: string;
  local: string;
  server: string;
  changed: boolean;
}

function assetsDescription(input: unknown): string {
  const assets = normalizeQuestionAssets(input);
  return assets.length
    ? assets.map(a => [a.placement, a.assetType, a.url, a.title ?? '', a.altText ?? ''].join(' · ')).join('\n')
    : '—';
}

/** Compare both versions, preserving the author's form without any server write. */
export function compareQuestionRevisions(
  author: Pick<QuestionStudioFormValues, 'content' | 'grade' | 'projectId' | 'options' | 'correctAnswer' | 'explanation' | 'assets'>,
  server: ApiQuestion
): QuestionRevisionDifference[] {
  const rows: Array<[string, string, string]> = [
    ['Soru kökü', author.content, server.content],
    ['Sınıf', author.grade, server.grade ?? ''],
    ['Proje', author.projectId === null ? 'Genel havuz' : String(author.projectId),
      server.projectId === null ? 'Genel havuz' : String(server.projectId)],
    ...normalizeQuestionOptions(author.options).map((value, i): [string, string, string] => [
      'Seçenek ' + String.fromCharCode(65 + i), value,
      normalizeQuestionOptions(server.options)[i]
    ]),
    ['Doğru cevap', author.correctAnswer, server.correctAnswer ?? ''],
    ['Çözüm', author.explanation, server.explanation ?? ''],
    ['Medya', assetsDescription(author.assets), assetsDescription(server.assets)]
  ];
  return rows.map(([field, local, current]) => ({
    field, local: local || '—', server: current || '—', changed: local !== current
  }));
}
