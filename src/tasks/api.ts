import type { ApiTask, CreateTaskInput, UpdateTaskInput } from './types';

export class TaskApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
    this.name = 'TaskApiError';
  }
}

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const apiMessage = typeof body?.error === 'string' ? body.error : '';
    if (response.status === 401) throw new TaskApiError(401, 'Oturum süresi dolmuş veya yetkisiz.', body);
    if (response.status === 403) throw new TaskApiError(403, apiMessage || 'Bu görev işlemi için yetkiniz yok.', body);
    if (response.status === 404) throw new TaskApiError(404, apiMessage || 'Görev bulunamadı.', body);
    if (response.status === 409) throw new TaskApiError(409, apiMessage || 'Görev mevcut durumu nedeniyle güncellenemedi.', body);
    if (response.status >= 500) throw new TaskApiError(response.status, 'Görevler işlenemedi. Lütfen daha sonra tekrar deneyin.', body);
    throw new TaskApiError(response.status, apiMessage || 'Görev işlemi başarısız.', body);
  }
  return body as T;
}

export async function fetchTasks(projectId?: number | null): Promise<ApiTask[]> {
  const query = projectId ? `?projectId=${projectId}` : '';
  return parse<ApiTask[]>(await fetch(`/api/v1/tasks${query}`, { credentials: 'include' }));
}

export async function createTask(input: CreateTaskInput): Promise<ApiTask> {
  return parse<ApiTask>(await fetch('/api/v1/tasks', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  }));
}

export async function updateTask(id: number, input: UpdateTaskInput): Promise<ApiTask> {
  return parse<ApiTask>(await fetch(`/api/v1/tasks/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  }));
}

export async function deleteTask(id: number): Promise<{ deleted: true; id: number }> {
  return parse<{ deleted: true; id: number }>(await fetch(`/api/v1/tasks/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  }));
}
