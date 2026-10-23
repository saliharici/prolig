import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  GENERAL_RECOVERY_NOTICE, TOKEN_LIFETIME_MS,
  canConsumeToken, hashSecret, isActiveAccount, isTokenShape, isValidPassword,
  newResetToken, previewOrigin, recoveryLink, requestFromTrustedOrigin
} from '../api/v1/_lib/password-recovery';
import { hasCurrentSessionVersion } from '../api/v1/_lib/auth';

const source = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const requestHandler = source('api/v1/_lib/ux03-reset-request.ts');
const completeHandler = source('api/v1/_lib/ux03-reset-complete.ts');
const schema = source('prisma/schema.prisma');

describe('UX-03 only · guarded account recovery and session contracts', () => {
  it('does not reveal existence or reset/activate a passive account', () => {
    expect(GENERAL_RECOVERY_NOTICE).not.toMatch(/aktif|pasif|bulunamadı/i);
    expect(isActiveAccount('Pasif')).toBe(false);
    expect(isActiveAccount('Aktif')).toBe(true);
    expect(isActiveAccount(undefined)).toBe(false);
    expect(requestHandler).toContain('if (!user || !isActiveAccount(user.status)) return reply()');
    expect(completeHandler).toContain("where: { id: user.id, status: 'Aktif' }");
    expect(completeHandler).not.toMatch(/data:\s*\{[^}]*status:\s*['"]Aktif['"]/);
  });

  it('requires actual Preview origin, not Production or an attacker-controlled host', () => {
    const url = 'https://prolig-k4bulo81u-salih22.vercel.app';
    expect(previewOrigin(url, 'preview')).toBe(true);
    expect(previewOrigin(url, 'production')).toBe(false);
    expect(previewOrigin('https://prolig.vercel.app', 'preview')).toBe(false);
    expect(previewOrigin(url + '.evil.com', 'preview')).toBe(false);
    expect(previewOrigin('http://prolig-k4bulo81u-salih22.vercel.app', 'preview')).toBe(false);
    const request = { headers: { origin: url, 'content-type': 'application/json' } } as never;
    expect(requestFromTrustedOrigin(request, url)).toBe(true);
    expect(requestFromTrustedOrigin({ headers: { origin: 'https://evil.com', 'content-type': 'application/json' } } as never, url)).toBe(false);
  });

  it('uses unpredictable single-purpose tokens whose raw value is not the stored hash', () => {
    const a = newResetToken(), b = newResetToken(), secret = 'test-only-unit-pepper-DO-NOT-DEPLOY-123';
    expect(isTokenShape(a)).toBe(true);
    expect(a).not.toBe(b);
    expect(hashSecret(a, secret)).not.toBe(a);
    expect(hashSecret(a, secret)).not.toBe(hashSecret(b, secret));
    expect(isTokenShape('wrong')).toBe(false);
    expect(recoveryLink('https://prolig-k4bulo81u-salih22.vercel.app', a)).toContain('/#ux03-reset=');
    expect(TOKEN_LIFETIME_MS).toBe(900000);
  });

  it('rejects wrong, expired, and replayed reset challenges', () => {
    const now = new Date('2026-10-24T12:00:00.000Z');
    expect(isTokenShape('not-a-token')).toBe(false);
    expect(canConsumeToken({ usedAt: null, expiresAt: new Date(now.getTime() - 1) }, now)).toBe(false);
    expect(canConsumeToken({ usedAt: now, expiresAt: new Date(now.getTime() + 1000) }, now)).toBe(false);
    expect(canConsumeToken({ usedAt: null, expiresAt: new Date(now.getTime() + 1000) }, now)).toBe(true);
    expect(completeHandler).toContain('claimed.count !== 1');
    expect(completeHandler).toContain("isolationLevel: 'Serializable'");
    expect(completeHandler).toContain('usedAt: null, expiresAt: { gt: now }');
  });

  it('enforces password complexity, rate limiting and fail-closed delivery service', () => {
    expect(isValidPassword('short')).toBe(false);
    expect(isValidPassword('alowercaseonlybutlong')).toBe(false);
    expect(isValidPassword('GoodPa55phrase2026')).toBe(true);
    expect(requestHandler).toContain('if (!config) return res.status(503)');
    expect(requestHandler).toContain('return res.status(429)');
    expect(requestHandler).toContain('await charge(pairKey, 5, now)');
    expect(requestHandler).toContain('await charge(ipKey, 30, now)');
    expect(requestHandler).toContain("res.status(202).json({ message: GENERAL_RECOVERY_NOTICE })");
    expect(schema).toContain('model PasswordResetToken');
    expect(schema).toContain('model PasswordResetRate');
  });

  it('revokes old JWTs centrally while leaving role authorization unchanged', () => {
    const before = process.env.UX03_RECOVERY_ENABLED, env = process.env.VERCEL_ENV;
    try {
      process.env.UX03_RECOVERY_ENABLED = 'true';
      process.env.VERCEL_ENV = 'preview';
      const authVersion = 2;
      expect(hasCurrentSessionVersion({ userId: 1, version: null }, authVersion)).toBe(false);
      expect(hasCurrentSessionVersion({ userId: 1, version: authVersion - 1 }, authVersion)).toBe(false);
      expect(hasCurrentSessionVersion({ userId: 1, version: authVersion }, authVersion)).toBe(true);
      expect(source('api/v1/_lib/current-user.ts')).toContain('hasCurrentSessionVersion(claims, user.authVersion)');
      expect(source('api/v1/auth/me.ts')).toContain('hasCurrentSessionVersion(claims, user.authVersion)');
      expect(completeHandler).toContain('authVersion: { increment: 1 }');
      expect(completeHandler).toContain("action: 'PASSWORD_RESET_COMPLETED'");
      expect(source('api/v1/management.ts')).toContain("if (!coordinatorRoles.has(user.role.code)) return res.status(403)");
      expect(source('vercel.json')).toContain('"/api/v1/users"');
      expect(source('vercel.json')).toContain('passwordResetComplete');
      expect(source('api/v1/management.ts')).toContain("handleUx03ResetComplete(req, res)");
    } finally {
      if (before === undefined) delete process.env.UX03_RECOVERY_ENABLED; else process.env.UX03_RECOVERY_ENABLED = before;
      if (env === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = env;
    }
  });

  it('requires real delivery configuration and never auto-activates a TEST identity', () => {
    const recovery = source('api/v1/_lib/password-recovery.ts');
    expect(recovery).toContain("process.env.UX03_RESEND_API_KEY");
    expect(recovery).toContain("process.env.UX03_RESET_FROM");
    expect(recovery).toContain("process.env.UX03_TOKEN_PEPPER");
    expect(recovery).toContain("process.env.UX03_RECOVERY_ENABLED !== 'true'");
    expect(recovery).toContain("process.env.VERCEL_ENV");
    expect(completeHandler).not.toContain("status: 'Aktif',");
    expect(source('src/auth/LoginScreen.tsx')).toContain('Şifremi unuttum');
    expect(source('src/auth/PasswordRecoveryScreen.tsx')).toContain('Şifremi unuttum');
  });
});
