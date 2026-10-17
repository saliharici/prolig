import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { resolveQuestionStudioFlags } from '../src/questions/studio-release-flags';
import { latestAuthorizedAudit, latestScopedPayments, latestScopedQuestions } from '../src/overview/live-activity';
import { fetchAuditLogs } from '../src/audit/api';
import type { ApiQuestion } from '../src/questions/types';
import type { ApiPayment } from '../src/payments/types';
import type { ApiAuditLog } from '../src/audit/types';

describe('P0-01 Question Studio release gates — no implicit activation', () => {
  it('keeps all modes off by default and rejects partial guided-mode configuration', () => {
    expect(resolveQuestionStudioFlags({})).toMatchObject({
      p1Workspace: false, richEditor: false, guidedP2: false,
      durableRecovery: false, localGuardedWrites: false
    });
    expect(resolveQuestionStudioFlags({ VITE_QUESTION_STUDIO_P2_TYPES: 'true' }))
      .toMatchObject({ guidedP2: false, configurationWarnings: expect.arrayContaining([expect.stringContaining('together')]) });
    expect(resolveQuestionStudioFlags({ VITE_QUESTION_STUDIO_P2_EDITOR: 'true' }))
      .toMatchObject({ richEditor: true, guidedP2: false });
  });
  it('preserves P1, P1C and rich editor independent fallback behavior', () => {
    const result = resolveQuestionStudioFlags({
      VITE_QUESTION_STUDIO_P1: 'true',
      VITE_QUESTION_STUDIO_P1C: 'true',
      VITE_QUESTION_STUDIO_P2_EDITOR: 'true',
      VITE_QUESTION_STUDIO_P2_TYPES: 'true'
    });
    expect(result).toMatchObject({
      p1Workspace: true, durableRecovery: true, richEditor: true,
      guidedP2: true, localGuardedWrites: false, configurationWarnings: []
    });
    expect(resolveQuestionStudioFlags({ VITE_QUESTION_STUDIO_P1C: 'true' }))
      .toMatchObject({ durableRecovery: false, configurationWarnings: expect.arrayContaining([expect.stringContaining('requires')]) });
    expect(resolveQuestionStudioFlags({ VITE_QUESTION_STUDIO_P2_EDITOR: 'TRUE', VITE_QUESTION_STUDIO_P2_TYPES: '1' }).guidedP2).toBe(false);
  });
  it('keeps local test write flag off without literal opt-in', () => {
    expect(resolveQuestionStudioFlags({ PROLIG_P2_LOCAL_GUARDED_WRITES: 'yes' }).localGuardedWrites).toBe(false);
    expect(resolveQuestionStudioFlags({ PROLIG_P2_LOCAL_GUARDED_WRITES: 'true' }).localGuardedWrites).toBe(true);
    const src = fs.readFileSync(path.resolve('src/DemoApp.tsx'), 'utf8');
    expect(src).toContain('questionStudioReleaseFlags.localGuardedWrites');
    expect(src).not.toContain('import.meta.env.PROLIG_P2_LOCAL_GUARDED_WRITES');
  });
});

describe('P0-04 Live home cards never present local demo activity as transactions', () => {
  const questions = [
    { id: 1, status: 'TASLAK', updatedAt: '2026-10-10T09:00:00Z', isArchived: false, author: { fullName: 'Yazar A' }, project: null },
    { id: 2, status: 'INCELEMEDE', updatedAt: '2026-10-11T09:00:00Z', isArchived: true, author: { fullName: 'Yazar B' }, project: null },
    { id: 3, status: 'ONAYLANDI', updatedAt: '2026-10-12T09:00:00Z', isArchived: false, author: { fullName: 'Yazar C' }, project: { title: 'Proje C' } }
  ] as ApiQuestion[];

  it('uses role-scoped active questions as status snapshots, never invents events', () => {
    expect(latestScopedQuestions(questions).map(x => x.id)).toEqual([3, 1]);
    expect(latestScopedQuestions(questions)[0]).toMatchObject({
      title: 'Soru #3 · Onaylandı', actor: 'Yazar C', secondary: 'Proje C'
    });
    expect(questions.map(x => x.id)).toEqual([1, 2, 3]);
  });

  it('uses only real payment DTOs and sorts by last updated', () => {
    const payments = [
      { id: 11, status: 'Odendi', amount: '10.20', updatedAt: '2026-10-11T09:00:00Z' },
      { id: 12, status: 'Bekliyor', amount: '4.05', updatedAt: '2026-10-12T09:00:00Z' }
    ] as ApiPayment[];
    expect(latestScopedPayments(payments)).toMatchObject([
      { id: 12, title: 'Ödeme #12 · Bekliyor', amount: '4.05' },
      { id: 11, title: 'Ödeme #11 · Ödendi', amount: '10.20' }
    ]);
  });

  it('does not confuse audit action history with question snapshots', () => {
    const logs = [
      { id: 5, createdAt: '2026-10-12T09:00:00Z', action: 'PAYMENT_PAID' },
      { id: 3, createdAt: '2026-10-13T09:00:00Z', action: 'QUESTION_SUBMITTED' }
    ] as ApiAuditLog[];
    expect(latestAuthorizedAudit(logs).map(x => x.id)).toEqual([3, 5]);
  });

  it('removes localStorage activities from the authenticated homepage and avoids stale zeros', () => {
    const src = fs.readFileSync(path.resolve('src/DemoApp.tsx'), 'utf8');
    expect(src).not.toContain('visibleActivities.slice');
    expect(src).not.toContain("data.activities.filter(item => item.type === 'payment')");
    expect(src).toContain('latestScopedPayments(apiPayments)');
    expect(src).toContain('latestScopedQuestions(apiQuestions)');
    expect(src).toContain('latestAuthorizedAudit(auditLogs)');
    expect(src).toContain("['overview', 'audit'].includes(section)");
    expect(src).toContain('paymentsLoading || paymentsError');
    expect(src).toContain('auditError ?');
  });

  it('fails closed on malformed audit responses instead of breaking a dashboard', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    try {
      await expect(fetchAuditLogs(4)).rejects.toThrow('beklenmeyen biçimde');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
