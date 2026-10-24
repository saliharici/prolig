import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setSessionCookie } from '../api/v1/_lib/auth';
import { UX03_TEST_PREVIEW_ORIGIN } from '../api/v1/_lib/password-recovery';
import completeReset from '../api/v1/_lib/ux03-reset-complete';
import getMe from '../api/v1/auth/me';

/**
 * Isolated API handler acceptance, not a Production or deployed-HTTP claim.
 * Tests the complete handler status codes and single-use claim against a
 * deterministic TEST-only in-memory Prisma seam. Never accesses real secrets,
 * personal passwords, Neon Production or the user's reset email/token.
 */
const state = vi.hoisted(() => ({
  authVersion: 0,
  usedAt: null as Date | null,
  auditCount: 0,
  passwordUpdates: 0,
  storedHash: null as string | null,
}));

vi.mock('../api/v1/_lib/prisma.js', () => {
  const prisma = {
    passwordResetRate: {
      updateMany: vi.fn(async () => ({ count: 0 })),
      upsert: vi.fn(async () => ({ attempts: 1 })),
    },
    passwordResetToken: {
      findUnique: vi.fn(async () => ({
        userId: 42,
        expiresAt: new Date(Date.now() + 15 * 60_000),
        usedAt: state.usedAt,
      })),
      updateMany: vi.fn(async ({ data }: { data: { usedAt: Date } }) => {
        if (state.usedAt !== null) return { count: 0 };
        state.usedAt = data.usedAt;
        return { count: 1 };
      }),
    },
    user: {
      findUnique: vi.fn(async () => ({
        id: 42,
        email: 'ux03-test@example.invalid',
        fullName: 'UX03 Test Only',
        status: 'Aktif',
        authVersion: state.authVersion,
        role: { code: 'YAZAR' },
      })),
      updateMany: vi.fn(async ({ data }: { data: { passwordHash: string; authVersion: { increment: number } } }) => {
        state.storedHash = data.passwordHash;
        state.authVersion += data.authVersion.increment;
        state.passwordUpdates += 1;
        return { count: 1 };
      }),
    },
    activityLog: {
      create: vi.fn(async () => {
        state.auditCount += 1;
        return { id: state.auditCount };
      }),
    },
    $transaction: null as unknown,
  };
  prisma.$transaction = vi.fn(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma));
  return { prisma };
});

const envKeys = ['VERCEL_ENV', 'UX03_RECOVERY_ENABLED', 'AUTH_SECRET', 'UX03_TOKEN_PEPPER',
  'UX03_RESEND_API_KEY', 'UX03_RESET_FROM', 'UX03_PUBLIC_ORIGIN'] as const;
const originalEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
const origin = UX03_TEST_PREVIEW_ORIGIN;

type Captured = { status: number; body: any; headers: Record<string, string> };
function fakeResponse() {
  const captured: Captured = { status: 200, body: null, headers: {} };
  const res = {
    setHeader(name: string, value: string) {
      captured.headers[name.toLowerCase()] = value;
      return res;
    },
    status(status: number) { captured.status = status; return res; },
    json(body: unknown) { captured.body = body; return res; },
  } as unknown as VercelResponse;
  return { res, captured };
}
function sessionCookie(version: number): string {
  const { res, captured } = fakeResponse();
  setSessionCookie(res, 42, version);
  return captured.headers['set-cookie'].split(';')[0];
}
async function readMe(cookie: string): Promise<Captured> {
  const { res, captured } = fakeResponse();
  await getMe({ method: 'GET', headers: { cookie } } as unknown as VercelRequest, res);
  return captured;
}
async function complete(token: string): Promise<Captured> {
  const { res, captured } = fakeResponse();
  await completeReset({
    method: 'POST',
    headers: { origin, host: new URL(origin).host, 'content-type': 'application/json', 'x-vercel-forwarded-for': '198.51.100.1' },
    body: { token, password: 'ValidTestPassword7268!' },
  } as unknown as VercelRequest, res);
  return captured;
}
beforeEach(() => {
  state.authVersion = 0;
  state.usedAt = null;
  state.auditCount = 0;
  state.passwordUpdates = 0;
  state.storedHash = null;
  process.env.VERCEL_ENV = 'preview';
  process.env.UX03_RECOVERY_ENABLED = 'true';
  process.env.AUTH_SECRET = 'TEST_ONLY_session_key_handler_acceptance_123456789';
  process.env.UX03_TOKEN_PEPPER = 'TEST_ONLY_recovery_pepper_handler_acceptance_123456789';
  process.env.UX03_RESEND_API_KEY = 'test-no-real-send';
  process.env.UX03_RESET_FROM = 'onboarding@resend.dev';
  process.env.UX03_PUBLIC_ORIGIN = origin;
});
afterEach(() => {
  for (const key of envKeys) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});
describe('UX03 negative acceptance — real handlers, mocked TEST-only persistence', () => {
  it('rejects a replayed token and an old signed session after successful reset', async () => {
    const oldCookie = sessionCookie(0);
    expect((await readMe(oldCookie)).status).toBe(200);

    const token = 'a'.repeat(64); // not a real user's reset token
    const first = await complete(token);
    expect(first.status).toBe(200);
    expect(first.body.ok).toBe(true);
    expect(state.usedAt).toBeInstanceOf(Date);
    expect(state.authVersion).toBe(1);
    expect(state.passwordUpdates).toBe(1);
    expect(state.auditCount).toBe(1);
    expect(state.storedHash).toMatch(/^\$2[aby]\$/);

    const replay = await complete(token);
    expect(replay.status).toBe(400);
    expect(state.authVersion).toBe(1);
    expect(state.passwordUpdates).toBe(1);
    expect(state.auditCount).toBe(1);

    const oldSession = await readMe(oldCookie);
    expect(oldSession.status).toBe(401);
    expect(oldSession.headers['set-cookie']).toContain('Max-Age=0');

    const freshSession = await readMe(sessionCookie(1));
    expect(freshSession.status).toBe(200);
    expect(freshSession.body.user.role).toBe('YAZAR');
  });
});
