import type { AuditLogPage, ApiAuditLog } from './types';

export class AuditApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'AuditApiError';
  }
}

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) throw new AuditApiError(401, 'Oturum süresi dolmuş veya yetkisiz.');
    if (response.status === 403) throw new AuditApiError(403, 'İşlem geçmişini görüntüleme yetkiniz yok.');
    if (response.status >= 500) throw new AuditApiError(response.status, 'İşlem geçmişi yüklenemedi. Lütfen daha sonra tekrar deneyin.');
    throw new AuditApiError(response.status, typeof body?.error === 'string' ? body.error : 'İşlem geçmişi yüklenemedi.');
  }
  return body as T;
}

export async function fetchAuditLogPage(limit = 100, cursor: number | null = null): Promise<AuditLogPage> {
  const safeLimit = Number.isSafeInteger(limit) ? Math.min(Math.max(limit, 1), 200) : 100;
  if (cursor !== null && (!Number.isSafeInteger(cursor) || cursor <= 0)) {
    throw new AuditApiError(400, 'İşlem geçmişi sayfa işareti geçersiz.');
  }
  const suffix = cursor === null ? '' : `&cursor=${cursor}`;
  const response = await parse<AuditLogPage>(
    await fetch(`/api/v1/audit-logs?limit=${safeLimit}${suffix}`, { credentials: 'include' })
  );
  if (!response || !Array.isArray(response.logs)) {
    throw new AuditApiError(502, 'İşlem geçmişi beklenmeyen biçimde döndü.');
  }
  const nextCursor = response.nextCursor ?? null;
  if (nextCursor !== null && (!Number.isSafeInteger(nextCursor) || nextCursor <= 0)) {
    throw new AuditApiError(502, 'İşlem geçmişi sayfalama yanıtı geçersiz.');
  }
  return { logs: response.logs, nextCursor };
}

/** Preserves the previous one-page client contract for legacy callers. */
export async function fetchAuditLogs(limit = 100): Promise<ApiAuditLog[]> {
  return (await fetchAuditLogPage(limit)).logs;
}
