import type { ApiAuthor } from './types';

export class AuthorApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'AuthorApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 401) throw new AuthorApiError(401, 'Oturum süresi dolmuş veya yetkisiz.');
    if (response.status === 403) throw new AuthorApiError(403, 'Yazar ağını görüntüleme yetkiniz yok.');
    if (response.status >= 500) throw new AuthorApiError(response.status, 'Yazar ağı yüklenemedi. Lütfen daha sonra tekrar deneyin.');
    throw new AuthorApiError(response.status, 'Yazar ağı yüklenemedi.');
  }
  return response.json() as Promise<T>;
}

export async function fetchAuthors(): Promise<ApiAuthor[]> {
  const response = await fetch('/api/v1/authors', { credentials: 'include' });
  return handleResponse<ApiAuthor[]>(response);
}
