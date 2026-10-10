import type { AuditLogResponse, ApiAuditLog } from './types';

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

export async function fetchAuditLogs(limit = 100): Promise<ApiAuditLog[]> {
  const safeLimit = Number.isSafeInteger(limit) ? Math.min(Math.max(limit, 1), 200) : 100;
  const response = await parse<AuditLogResponse>(
    await fetch(`/api/v1/audit-logs?limit=${safeLimit}`, { credentials: 'include' })
  );
  return response.logs;
}
