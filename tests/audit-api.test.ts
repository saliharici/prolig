import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { AuditApiError, fetchAuditLogPage, fetchAuditLogs } from '../src/audit/api';

global.fetch = vi.fn();

describe('real audit log integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('loads ActivityLog records through the consolidated management route', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        logs: [{
          id: 1,
          userName: 'Genel Koordinatör',
          action: 'PAYMENT_APPROVED',
          entityType: 'Payment',
          entityId: 7,
          details: '{"previousStatus":"Bekliyor"}',
          createdAt: '2026-10-10T17:00:00.000Z'
        }]
      })
    } as Response);

    const logs = await fetchAuditLogs(150);
    expect(fetch).toHaveBeenCalledWith('/api/v1/audit-logs?limit=150', { credentials: 'include' });
    expect(logs[0].action).toBe('PAYMENT_APPROVED');
  });

  it('fails closed when audit access is forbidden', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Forbidden' })
    } as Response);

    await expect(fetchAuditLogs()).rejects.toBeInstanceOf(AuditApiError);
  });

  it('keeps audit logs on the existing management serverless function and general-only scope', () => {
    const management = fs.readFileSync(path.resolve(__dirname, '../api/v1/management.ts'), 'utf8');
    const vercel = fs.readFileSync(path.resolve(__dirname, '../vercel.json'), 'utf8');
    const demo = fs.readFileSync(path.resolve(__dirname, '../src/DemoApp.tsx'), 'utf8');

    expect(management).toContain("action === 'auditLogs'");
    expect(management).toContain("user.role.code !== 'GENEL_KOORDINATOR'");
    expect(management).toContain('prisma.activityLog.findMany');
    expect(vercel).toContain('"/api/v1/audit-logs"');
    expect(vercel).toContain('"/api/v1/management?action=auditLogs"');
    expect(demo).toContain('function AuditLogCenter(');
    expect(demo).toContain('fetchAuditLogPage(150)');
    expect(demo).not.toContain('Demo verisi · Yerel tarayıcı kaydı');
  });

  it('loads older ActivityLog pages without changing role scopes', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        logs: [{ id: 3, userName: 'Test', action: 'TASK_UPDATED', entityType: 'Task', entityId: 8, details: null, createdAt: '2026-10-23T17:00:00Z' }],
        nextCursor: 3
      })
    } as Response);
    const page = await fetchAuditLogPage(150, 8);
    expect(fetch).toHaveBeenCalledWith('/api/v1/audit-logs?limit=150&cursor=8', { credentials: 'include' });
    expect(page.nextCursor).toBe(3);
    expect(page.logs).toHaveLength(1);
  });

  it('rejects malformed page cursors before calling the server', async () => {
    await expect(fetchAuditLogPage(150, -1)).rejects.toBeInstanceOf(AuditApiError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps the server-side page limit and RBAC before querying audit logs', () => {
    const management = fs.readFileSync(path.resolve(__dirname, '../api/v1/management.ts'), 'utf8');
    const scope = management.slice(management.indexOf("if (action === 'auditLogs')"), management.indexOf("if (!coordinatorRoles.has(user.role.code))"));
    expect(scope).toContain("user.role.code !== 'GENEL_KOORDINATOR'");
    expect(scope).toContain("cursor: { id: cursorId }, skip: 1");
    expect(scope).toContain('take: limit + 1');
    expect(scope).toContain('nextCursor: hasMore');
  });

  it('uses the new Telif ve Ödemeler module label', () => {
    const model = fs.readFileSync(path.resolve(__dirname, '../src/demo/model.ts'), 'utf8');
    const demo = fs.readFileSync(path.resolve(__dirname, '../src/DemoApp.tsx'), 'utf8');

    expect(model).toContain("payments: 'Telif ve Ödemeler'");
    expect(demo).toContain('Telif ve Ödeme Merkezi');
  });
});
