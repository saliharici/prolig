import type { ApiProject } from './types';

export class ProjectApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ProjectApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let apiMessage = '';
    try {
      const body = await response.json();
      apiMessage = body.error || '';
    } catch {
      // Response body is optional for mapped errors.
    }

    if (response.status === 401) throw new ProjectApiError(401, 'Oturum süresi dolmuş veya yetkisiz.');
    if (response.status === 403) throw new ProjectApiError(403, 'Projeleri görüntüleme yetkiniz yok.');
    if (response.status === 404) throw new ProjectApiError(404, 'Proje bulunamadı.');
    if (response.status >= 500) throw new ProjectApiError(response.status, 'Projeler yüklenemedi. Lütfen daha sonra tekrar deneyin.');
    throw new ProjectApiError(response.status, apiMessage || 'Projeler yüklenemedi.');
  }

  return response.json() as Promise<T>;
}

export async function fetchProjects(): Promise<ApiProject[]> {
  const response = await fetch('/api/v1/projects', { credentials: 'include' });
  return handleResponse<ApiProject[]>(response);
}
