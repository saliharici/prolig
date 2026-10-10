import type { ApiProject, CreateProjectInput, UpdateProjectInput } from './types';

export class ProjectApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
    this.name = 'ProjectApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  let body: any = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }

  if (!response.ok) {
    const apiMessage = typeof body?.error === 'string' ? body.error : '';

    if (response.status === 401) throw new ProjectApiError(401, 'Oturum süresi dolmuş veya yetkisiz.', body);
    if (response.status === 403) throw new ProjectApiError(403, apiMessage || 'Bu proje işlemi için yetkiniz yok.', body);
    if (response.status === 404) throw new ProjectApiError(404, 'Proje bulunamadı.', body);
    if (response.status === 409) throw new ProjectApiError(409, apiMessage || 'Proje mevcut durumu nedeniyle güncellenemedi.', body);
    if (response.status >= 500) throw new ProjectApiError(response.status, 'Projeler işlenemedi. Lütfen daha sonra tekrar deneyin.', body);
    throw new ProjectApiError(response.status, apiMessage || 'Proje işlemi başarısız.', body);
  }

  return body as T;
}

export async function fetchProjects(): Promise<ApiProject[]> {
  const response = await fetch('/api/v1/projects', { credentials: 'include' });
  return handleResponse<ApiProject[]>(response);
}

export async function createProject(input: CreateProjectInput): Promise<ApiProject> {
  const response = await fetch('/api/v1/projects', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  return handleResponse<ApiProject>(response);
}

export async function updateProject(id: number, input: UpdateProjectInput): Promise<ApiProject> {
  const response = await fetch(`/api/v1/projects/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  return handleResponse<ApiProject>(response);
}

export async function changeProjectLifecycle(id: number, action: 'archive' | 'restore'): Promise<ApiProject> {
  const response = await fetch(`/api/v1/projects/${id}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action })
  });
  return handleResponse<ApiProject>(response);
}

export async function deleteProject(id: number): Promise<{ deleted: true; id: number }> {
  const response = await fetch(`/api/v1/projects/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  return handleResponse<{ deleted: true; id: number }>(response);
}
