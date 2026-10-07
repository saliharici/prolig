import { ApiQuestion } from './types';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = 'Bir hata oluştu';
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch (e) {
      // Ignored
    }

    if (res.status === 400) throw new ApiError(400, `Doğrulama hatası: ${message}`);
    if (res.status === 401) throw new ApiError(401, 'Oturum süresi dolmuş veya yetkisiz.');
    if (res.status === 403) throw new ApiError(403, 'Bu işlem için yetkiniz yok.');
    if (res.status === 404) throw new ApiError(404, 'Kayıt bulunamadı.');
    if (res.status === 409) throw new ApiError(409, 'Soru başka bir işlemle güncellendi. Güncel kayıt yeniden yüklendi.');
    if (res.status >= 500) throw new ApiError(res.status, 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.');
    
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

export async function fetchQuestions(): Promise<ApiQuestion[]> {
  const res = await fetch('/api/v1/questions', {
    credentials: 'include',
  });
  return handleResponse<ApiQuestion[]>(res);
}

export async function createQuestion(input: Partial<ApiQuestion>): Promise<ApiQuestion> {
  const res = await fetch('/api/v1/questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  return handleResponse<ApiQuestion>(res);
}

export async function patchQuestion(id: number, input: Partial<ApiQuestion>): Promise<ApiQuestion> {
  const res = await fetch(`/api/v1/questions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  return handleResponse<ApiQuestion>(res);
}

export async function runQuestionWorkflow(id: number, action: string, note?: string): Promise<ApiQuestion> {
  const res = await fetch(`/api/v1/questions/${id}/workflow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ action, note }),
  });
  return handleResponse<ApiQuestion>(res);
}
