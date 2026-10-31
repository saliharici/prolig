import { describe, expect, it, vi } from 'vitest';
import { RELEASE03_DB_HOST, RELEASE03_REF } from '../server/release03-db-policy.js';
import {
  release03TlsOptions, release03VerifiedPgConnectionString, isRelease03VerifiedTlsSocket
} from '../server/release03-tls-identity.js';
import { isRelease03BookPreviewAllowed } from '../server/release03-book-preview.js';

// No real session, write operation, or database is used by these tests.
vi.mock('../api/v1/_lib/prisma.js', () => ({ prisma: {} }));
import { bookApiPreviewEnabled } from '../api/v1/_lib/book-handler.js';
import { canEditBookDraft } from '../src/publishing/book-draft-contract.js';

const url = `postgresql://neondb_owner:fixture-only@${RELEASE03_DB_HOST}/neondb?sslmode=verify-full`;
const env = () => ({
  VERCEL: '1', VERCEL_ENV: 'preview', NODE_ENV: 'production',
  VERCEL_GIT_COMMIT_REF: RELEASE03_REF,
  VERCEL_GIT_COMMIT_SHA: 'a'.repeat(40),
  VERCEL_GIT_REPO_OWNER: 'saliharici', VERCEL_GIT_REPO_SLUG: 'prolig',
  PROLIG_BOOKS_V2_ENABLED: 'true',
  DATABASE_URL: url, POSTGRES_URL: url, PRISMA_DATABASE_URL: url, DIRECT_URL: url
});
const socket = (overrides: Record<string, unknown> = {}) => ({
  encrypted: true, authorized: true, authorizationError: undefined,
  servername: RELEASE03_DB_HOST,
  getPeerCertificate: () => ({ raw: Buffer.from('fixture'), subjectaltname: 'DNS:*.c-8.eu-central-1.aws.neon.tech' }),
  ...overrides,
});

describe('RELEASE03 actual-client TLS guard (unit simulation)', () => {
  it('requires a verified, encrypted socket and matching server name/certificate', () => {
    expect(isRelease03VerifiedTlsSocket(socket())).toBe(true);
    expect(release03TlsOptions()).toMatchObject({rejectUnauthorized: true, servername: RELEASE03_DB_HOST, minVersion: 'TLSv1.2'});
  });
  it.each([
    ['plaintext', { encrypted: false }],
    ['untrusted chain', { authorized: false }],
    ['certificate authorization error', { authorizationError: 'SELF_SIGNED_CERT_IN_CHAIN' }],
    ['unexpected SNI', { servername: 'production.neon.tech' }],
    ['no certificate', { getPeerCertificate: () => ({}) }],
    ['wrong certificate SAN', { getPeerCertificate: () => ({ raw: Buffer.from('fixture'), subjectaltname: 'DNS:attacker.example' }) }],
  ])('rejects %s', (_, override) => {
    expect(isRelease03VerifiedTlsSocket(socket(override))).toBe(false);
  });
  it('keeps verify-full compulsory in the input DSN while removing only the driver-conflicting query switch', () => {
    const checked = release03VerifiedPgConnectionString(url);
    expect(new URL(checked).searchParams.has('sslmode')).toBe(false);
    expect(new URL(checked).hostname).toBe(RELEASE03_DB_HOST);
    expect(url).toContain('sslmode=verify-full');
  });
  it.each([
    ['wrong host', url.replace(RELEASE03_DB_HOST, 'production.neon.tech')],
    ['weak sslmode', url.replace('verify-full', 'require')],
    ['missing TLS flag', url.replace('?sslmode=verify-full', '')],
    ['wrong user', url.replace('neondb_owner', 'postgres')],
    ['wrong database', url.replace('/neondb?', '/wrong?')],
  ])('rejects %s before connection', (_, value) => {
    expect(() => release03VerifiedPgConnectionString(value)).toThrow('RELEASE03_DB_GUARD_BLOCKED');
  });
});

describe('RELEASE03 Books V2 gate (no DB or external write)', () => {
  it('opens only the correct isolated Preview with explicit opt-in', () => {
    expect(isRelease03BookPreviewAllowed(env())).toBe(true);
    expect(bookApiPreviewEnabled(env())).toBe(true);
  });
  it.each([
    ['flag not enabled', { PROLIG_BOOKS_V2_ENABLED: undefined }],
    ['production', { VERCEL_ENV: 'production' }],
    ['wrong ref', { VERCEL_GIT_COMMIT_REF: 'main' }],
    ['wrong repo owner', { VERCEL_GIT_REPO_OWNER: 'other' }],
    ['wrong repo', { VERCEL_GIT_REPO_SLUG: 'other' }],
    ['missing git sha', { VERCEL_GIT_COMMIT_SHA: undefined }],
    ['wrong TEST host', { DIRECT_URL: url.replace(RELEASE03_DB_HOST, 'production.neon.tech') }],
    ['wrong PostgreSQL role', { DATABASE_URL: url.replace('neondb_owner', 'postgres') }],
    ['missing fallback', { POSTGRES_URL: undefined }],
  ])('rejects %s', (_, patch) => {
    expect(isRelease03BookPreviewAllowed({ ...env(), ...patch })).toBe(false);
    expect(bookApiPreviewEnabled({ ...env(), ...patch })).toBe(false);
  });
  it('preserves Genel Koordinatör-only authoring', () => {
    expect(canEditBookDraft('GENEL_KOORDINATOR')).toBe(true);
    expect(canEditBookDraft('YAZAR')).toBe(false);
    expect(canEditBookDraft('EDITOR')).toBe(false);
  });
});
