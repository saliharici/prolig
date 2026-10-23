import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionClaims, hasCurrentSessionVersion, setSessionCookie } from '../api/v1/_lib/auth';

const source = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const oldValues = {
  flag: process.env.UX03_RECOVERY_ENABLED,
  env: process.env.VERCEL_ENV,
  secret: process.env.AUTH_SECRET
};
afterEach(() => {
  for (const [key, old] of [
    ['UX03_RECOVERY_ENABLED', oldValues.flag],
    ['VERCEL_ENV', oldValues.env],
    ['AUTH_SECRET', oldValues.secret]
  ] as const) {
    if (old === undefined) delete process.env[key];
    else process.env[key] = old;
  }
});
describe('UX-03 · single session-version regression', () => {
  it('preserves an authenticated session after profile edit and rejects that same JWT after password reset', () => {
    process.env.UX03_RECOVERY_ENABLED = 'true';
    process.env.VERCEL_ENV = 'preview';
    process.env.AUTH_SECRET = 'TEST_ONLY_NON_PRODUCTION_SESSION_SECRET_32_BYTES';

    let header = '';
    const res = { setHeader: (name: string, value: string) => {
      expect(name).toBe('Set-Cookie');
      header = value;
    } } as VercelResponse;

    const initialAuthVersion = 0;
    setSessionCookie(res, 42, initialAuthVersion);
    const req = { headers: { cookie: header.split(';')[0] } } as VercelRequest;
    const originalClaims = getSessionClaims(req);
    expect(originalClaims).toEqual({ userId: 42, version: 0 });
    expect(hasCurrentSessionVersion(originalClaims, initialAuthVersion)).toBe(true);

    // Profile PATCH modifies @updatedAt but deliberately never changes authVersion.
    const meSource = source('api/v1/auth/me.ts');
    expect(meSource).toContain('tx.user.update({ where: { id: userId }, data: userData })');
    expect(meSource).toContain('hasCurrentSessionVersion(claims, user.authVersion)');
    expect(meSource).not.toContain('hasCurrentSessionVersion(claims, user.updatedAt)');
    expect(hasCurrentSessionVersion(originalClaims, initialAuthVersion)).toBe(true);

    // Reset completion atomically updates the credential and increments ONLY authVersion.
    const reset = source('api/v1/_lib/ux03-reset-complete.ts');
    expect(reset).toContain('authVersion: { increment: 1 }');
    expect(reset).toContain('passwordHash: newHash');
    expect(reset).toContain("isolationLevel: 'Serializable'");
    const afterPasswordReset = initialAuthVersion + 1;
    expect(hasCurrentSessionVersion(originalClaims, afterPasswordReset)).toBe(false);

    // Only a brand-new login signed with the new version restores access.
    setSessionCookie(res, 42, afterPasswordReset);
    const newClaims = getSessionClaims({ headers: { cookie: header.split(';')[0] } } as VercelRequest);
    expect(hasCurrentSessionVersion(newClaims, afterPasswordReset)).toBe(true);

    // Old unversioned JWT cannot silently survive recovery being enabled.
    expect(hasCurrentSessionVersion({ userId: 42, version: null }, afterPasswordReset)).toBe(false);
    expect(source('api/v1/_lib/current-user.ts')).toContain('hasCurrentSessionVersion(claims, user.authVersion)');
    expect(source('api/v1/auth/login.ts')).toContain('setSessionCookie(res, user.id, user.authVersion)');
    expect(source('prisma/schema.prisma')).toContain('authVersion    Int       @default(0)');
    expect(source('prisma/migrations/20261024010000_ux03_password_recovery/migration.sql'))
      .toContain('ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0');
  });
});
