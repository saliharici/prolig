import type { CompensationEntry, CompensationRule, CompensationRuleInput } from './types';

export class CompensationApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'CompensationApiError';
  }
}

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) throw new CompensationApiError(401, 'Oturum süresi dolmuş veya yetkisiz.');
    if (response.status === 403) throw new CompensationApiError(403, body?.error || 'Ücret tarifesi işlemi için yetkiniz yok.');
    if (response.status === 404) throw new CompensationApiError(404, body?.error || 'Ücret tarifesi veya proje bulunamadı.');
    if (response.status === 409) throw new CompensationApiError(409, body?.error || 'Ücret tarifesi zaten güncellenmiş.');
    if (response.status >= 500) throw new CompensationApiError(response.status, 'Ücret tarifeleri yüklenemedi. Daha sonra tekrar deneyin.');
    throw new CompensationApiError(response.status, body?.error || 'Ücret tarifesi işlemi başarısız.');
  }
  return body as T;
}

export async function fetchCompensationRules(history = true): Promise<CompensationRule[]> {
  const suffix = history ? '?history=1' : '';
  const response = await fetch(`/api/v1/compensation/rules${suffix}`, { credentials: 'include' });
  const body = await parse<{ rules: CompensationRule[] }>(response);
  return body.rules;
}

export async function createCompensationRule(input: CompensationRuleInput): Promise<CompensationRule> {
  const response = await fetch('/api/v1/compensation/rules', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  const body = await parse<{ rule: CompensationRule }>(response);
  return body.rule;
}

export async function deactivateCompensationRule(id: number): Promise<CompensationRule> {
  const response = await fetch(`/api/v1/compensation/rules/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'deactivate' })
  });
  const body = await parse<{ rule: CompensationRule }>(response);
  return body.rule;
}


export async function fetchCompensationEntries(limit = 300): Promise<CompensationEntry[]> {
  const safeLimit = Number.isSafeInteger(limit) ? Math.min(Math.max(limit, 1), 500) : 300;
  const response = await fetch(`/api/v1/compensation/entries?limit=${safeLimit}`, { credentials: 'include' });
  const body = await parse<{ entries: CompensationEntry[] }>(response);
  return body.entries;
}
