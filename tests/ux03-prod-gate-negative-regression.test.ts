import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionClaims, hasCurrentSessionVersion, setSessionCookie } from '../api/v1/_lib/auth';
import { getCurrentUser } from '../api/v1/_lib/current-user';
import getMe from '../api/v1/auth/me';
import requestRecovery from '../api/v1/_lib/ux03-reset-request';
import completeRecovery from '../api/v1/_lib/ux03-reset-complete';
import { recoveryConfig, requestFromTrustedOrigin, UX03_PRODUCTION_ORIGIN, UX03_TEST_PREVIEW_ORIGIN } from '../api/v1/_lib/password-recovery';

const user = vi.hoisted(() => ({ authVersion: 1 }));
vi.mock('../api/v1/_lib/prisma.js', () => ({
  prisma: { user: { findUnique: vi.fn(async () => ({
    id: 42, email: 'test@example.invalid', fullName: 'TEST',
    status: 'Aktif', authVersion: user.authVersion,
    role: { code: 'YAZAR' }, province: null,
    branchAssignments: [], AuthorProfile: null
  })) } }
}));
const keys = [
  'VERCEL_ENV', 'UX03_RECOVERY_ENABLED', 'AUTH_SECRET',
  'UX03_PUBLIC_ORIGIN', 'UX03_TOKEN_PEPPER', 'UX03_RESEND_API_KEY',
  'UX03_RESET_FROM', 'UX03_PRODUCTION_RECOVERY_ENABLED',
  'UX03_VERIFIED_SENDER_DOMAIN', 'UX03_VERIFIED_SENDER_CONFIRMED'
];
const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
const secret = 'ONLY_FOR_UX03_PROD_GATE_NEGATIVE_REGRESSION_20261024';
function res() {
  const snapshot = { status: 200, json: null as unknown, headers: {} as Record<string,string> };
  const response = {
    setHeader(key: string, value: string) { snapshot.headers[key.toLowerCase()] = value; return response; },
    status(value: number) { snapshot.status = value; return response; },
    json(value: unknown) { snapshot.json = value; return response; },
  } as unknown as VercelResponse;
  return { snapshot, response };
}
function cookie(version?: number) {
  if (version === undefined) {
    return 'prolig_session=' + jwt.sign({ sub: '42' }, secret, { algorithm: 'HS256', expiresIn: '7d' });
  }
  const { snapshot, response } = res();
  setSessionCookie(response, 42, version);
  return snapshot.headers['set-cookie'].split(';')[0];
}
async function me(cookieHeader: string): Promise<number> {
  const { snapshot, response } = res();
  await getMe({ method: 'GET', headers: { cookie: cookieHeader } } as VercelRequest, response);
  return snapshot.status;
}
async function protectedUser(cookieHeader: string): Promise<boolean> {
  return Boolean(await getCurrentUser({ headers: { cookie: cookieHeader } } as VercelRequest));
}
beforeEach(() => {
  user.authVersion = 1;
  process.env.AUTH_SECRET = secret;
  process.env.VERCEL_ENV = 'preview';
  process.env.UX03_RECOVERY_ENABLED = 'false';
});
afterEach(() => {
  for (const key of keys) if (original[key] === undefined) delete process.env[key];
  else process.env[key] = original[key];
});
describe('ADR-005: only new revocation and production default-deny negatives', () => {
  it.each([
    ['preview', 'false'], ['preview', 'true'],
    ['production', 'false'], ['production', 'true']
  ])('revoked JWT remains rejected when VERCEL_ENV=%s and mail flag=%s', async (target, mailFlag) => {
    process.env.VERCEL_ENV = target;
    process.env.UX03_RECOVERY_ENABLED = mailFlag;
    const old = cookie(0), fresh = cookie(1), legacy = cookie();
    expect(hasCurrentSessionVersion(getSessionClaims({headers:{cookie:old}} as VercelRequest),1)).toBe(false);
    expect(await me(old)).toBe(401);
    expect(await protectedUser(old)).toBe(false);
    expect(await me(legacy)).toBe(401);
    expect(await protectedUser(legacy)).toBe(false);
    expect(await me(fresh)).toBe(200);
    expect(await protectedUser(fresh)).toBe(true);
  });
  it('mail OFF blocks token endpoints without resurrecting JWTs', async () => {
    const old = cookie(0);
    process.env.UX03_RECOVERY_ENABLED = 'false';
    const request = {
      method: 'POST', headers: { origin: UX03_TEST_PREVIEW_ORIGIN,
        host: new URL(UX03_TEST_PREVIEW_ORIGIN).host, 'content-type': 'application/json' },
      body: { token: 'a'.repeat(64), password: 'TestOn1ySecurePhrase!' }
    } as VercelRequest;
    const before = res(); await completeRecovery(request, before.response);
    expect(before.snapshot.status).toBe(503);
    const requestEmail = res(); await requestRecovery({
      ...request, body: { email: 'test@example.invalid' }
    } as VercelRequest, requestEmail.response);
    expect(requestEmail.snapshot.status).toBe(503);
    expect(await me(old)).toBe(401);
    expect(await me(cookie(1))).toBe(200);
  });
  it('production mail fails closed unless all server-side conditions and verified sender exist', () => {
    process.env.VERCEL_ENV = 'production';
    process.env.UX03_RECOVERY_ENABLED = 'true';
    process.env.UX03_PUBLIC_ORIGIN = UX03_PRODUCTION_ORIGIN;
    process.env.UX03_TOKEN_PEPPER = 'TEST_ONLY_PEPPER_32_CHARACTERS_PLUS_LONG';
    process.env.UX03_RESEND_API_KEY = 'TEST_ONLY_NOT_REAL';
    process.env.UX03_RESET_FROM = 'onboarding@resend.dev';
    expect(recoveryConfig()).toBeNull();
    process.env.UX03_PRODUCTION_RECOVERY_ENABLED = 'true';
    process.env.UX03_VERIFIED_SENDER_DOMAIN = 'resend.dev';
    process.env.UX03_VERIFIED_SENDER_CONFIRMED = 'true';
    expect(recoveryConfig()).toBeNull();
    process.env.UX03_RESET_FROM = 'no-reply@prolig.example';
    process.env.UX03_VERIFIED_SENDER_DOMAIN = 'prolig.example';
    delete process.env.UX03_VERIFIED_SENDER_CONFIRMED;
    expect(recoveryConfig()).toBeNull();
    process.env.UX03_VERIFIED_SENDER_CONFIRMED = 'true';
    expect(recoveryConfig()?.origin).toBe(UX03_PRODUCTION_ORIGIN);
    process.env.UX03_PUBLIC_ORIGIN = 'https://prolig.vercel.app.evil.example';
    expect(recoveryConfig()).toBeNull();
    process.env.UX03_PUBLIC_ORIGIN = UX03_TEST_PREVIEW_ORIGIN;
    expect(recoveryConfig()).toBeNull();
    process.env.VERCEL_ENV = 'preview';
    expect(recoveryConfig()?.origin).toBe(UX03_TEST_PREVIEW_ORIGIN);
    process.env.UX03_PUBLIC_ORIGIN = 'https://prolig-another-branch-salih22.vercel.app';
    expect(recoveryConfig()).toBeNull();
  });
  it('spoofed Origin, Host, forwarded Host and content type are rejected', () => {
    const origin=UX03_PRODUCTION_ORIGIN,host=new URL(origin).host;
    const input = (headers: Record<string,string>) => ({
      headers: {origin,host,'content-type':'application/json',...headers}
    } as VercelRequest);
    expect(requestFromTrustedOrigin(input({}),origin)).toBe(true);
    expect(requestFromTrustedOrigin(input({origin:'https://evil.example'}),origin)).toBe(false);
    expect(requestFromTrustedOrigin(input({host:'evil.example'}),origin)).toBe(false);
    expect(requestFromTrustedOrigin(input({'x-forwarded-host':'evil.example'}),origin)).toBe(false);
    expect(requestFromTrustedOrigin(input({'content-type':'text/plain'}),origin)).toBe(false);
  });
  it('protected API entry points do not bypass version check through getSessionUserId', () => {
    const root = path.resolve(import.meta.dirname,'../api/v1');
    const enumerate=(folder:string):string[] => readdirSync(folder).flatMap(name=>{
      const full=path.join(folder,name);
      return statSync(full).isDirectory()?enumerate(full):full.endsWith('.ts')?[full]:[];
    });
    const bypasses=enumerate(root).filter(file=>!file.endsWith('/_lib/auth.ts')).filter(file=>
      /\bgetSessionUserId\s*\(/.test(readFileSync(file,'utf8')));
    expect(bypasses).toEqual([]);
    const gate=readFileSync(path.resolve(import.meta.dirname,'../src/auth/AuthGate.tsx'),'utf8');
    const vite=readFileSync(path.resolve(import.meta.dirname,'../vite.config.ts'),'utf8');
    expect(gate).toContain('__PROLIG_UX03_PRODUCTION_UI_ENABLED__');
    expect(gate).toContain("window.location.hostname === 'prolig.vercel.app'");
    expect(vite).toContain("process.env.VITE_UX03_PRODUCTION_RECOVERY_UI_ENABLED === 'true'");
    expect(vite).toContain("deploymentTarget === 'production'");
  });
});
