import type { ApiQuestion } from './types';
import { ApiError } from './api';

export interface PersonalQuestionSet {
  id: number;
  title: string;
  questionIds: number[];
  createdAt: string;
  updatedAt: string;
}
async function response<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>;
  let message = 'İşlem tamamlanamadı.';
  try { const payload = await res.json(); message = payload.error || message; } catch { /* keep generic */ }
  throw new ApiError(res.status, message);
}
async function action<T>(value: Record<string, unknown>): Promise<T> {
  return response<T>(await fetch('/api/v1/questions', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value)
  }));
}
export async function fetchPersonalQuestions(): Promise<ApiQuestion[]> {
  return response<ApiQuestion[]>(await fetch('/api/v1/questions?library=personal', { credentials: 'include' }));
}
export async function fetchPersonalSets(): Promise<PersonalQuestionSet[]> {
  return action<PersonalQuestionSet[]>({ action: 'listPersonalSets' });
}
export async function savePersonalSet(
  value: { setId?: number; title: string; questionIds: number[] }
): Promise<PersonalQuestionSet> {
  return action<PersonalQuestionSet>({
    action: value.setId ? 'updatePersonalSet' : 'createPersonalSet',
    ...value
  });
}
export async function deletePersonalSet(setId: number): Promise<void> {
  await action<{ deleted: true }>({ action: 'deletePersonalSet', setId });
}
export async function downloadPersonalSet(setId: number, includeAnswers: boolean): Promise<void> {
  const res = await fetch('/api/v1/questions', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'exportPersonalSet', setId, includeAnswers })
  });
  if (!res.ok) {
    let message = 'Word belgesi oluşturulamadı.';
    try { const payload = await res.json(); message = payload.error || message; } catch { /* ignore */ }
    throw new ApiError(res.status, message);
  }
  const blob = await res.blob();
  if (!blob.size) throw new ApiError(422, 'Word çıktısı boş döndü.');
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = /filename="([a-zA-Z0-9_-]+\.docx)"/.exec(disposition);
  const name = match?.[1] || 'yazar-masasi.docx';
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
  } finally { window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
