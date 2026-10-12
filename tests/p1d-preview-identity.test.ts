import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { isP1DPreviewSandboxTarget, p1dPreviewRefusalCode, P1D_PREVIEW_BRANCH } from '../api/v1/_lib/p1d-preview-identity';

const valid = {
  vercelEnv: 'preview',
  gitCommitRef: P1D_PREVIEW_BRANCH,
  databaseUrl: 'postgresql://pilot:privatepass@ep-safe-123.eu-central-1.aws.neon.tech/prolig_p1d_sandbox?sslmode=require'
};

describe('P1-D preview-only read-only database identity', () => {
  it('allows only the independent sandbox on the exact Preview git branch', () => {
    expect(isP1DPreviewSandboxTarget(valid)).toBe(true);
    expect(isP1DPreviewSandboxTarget({ ...valid, vercelEnv: 'production' })).toBe(false);
    expect(isP1DPreviewSandboxTarget({ ...valid, gitCommitRef: 'main' })).toBe(false);
    expect(isP1DPreviewSandboxTarget({ ...valid, databaseUrl: valid.databaseUrl!.replace('/prolig_p1d_sandbox', '/neondb') })).toBe(false);
    expect(isP1DPreviewSandboxTarget({ ...valid, databaseUrl: valid.databaseUrl!.replace('.neon.tech', '.invalid.example') })).toBe(false);
  });

  it('rejects malformed, blank, credential-free and non-Postgres URLs', () => {
    expect(isP1DPreviewSandboxTarget({ ...valid, databaseUrl: undefined })).toBe(false);
    expect(isP1DPreviewSandboxTarget({ ...valid, databaseUrl: 'not-a-url' })).toBe(false);
    expect(isP1DPreviewSandboxTarget({ ...valid, databaseUrl: valid.databaseUrl!.replace('privatepass', '') })).toBe(false);
    expect(isP1DPreviewSandboxTarget({ ...valid, databaseUrl: valid.databaseUrl!.replace('postgresql:', 'https:') })).toBe(false);
  });

  it('returns only a safe reason code for refused Preview routes and no secrets', () => {
    expect(p1dPreviewRefusalCode({ ...valid, vercelEnv: 'production' })).toBe('NOT_PREVIEW');
    expect(p1dPreviewRefusalCode({ ...valid, gitCommitRef: undefined })).toBe('BRANCH_METADATA_MISSING');
    expect(p1dPreviewRefusalCode({ ...valid, gitCommitRef: 'different-branch' })).toBe('BRANCH_MISMATCH');
    expect(p1dPreviewRefusalCode({ ...valid, databaseUrl: undefined })).toBe('DATABASE_URL_MISSING');
    expect(p1dPreviewRefusalCode({ ...valid, databaseUrl: valid.databaseUrl!.replace('/prolig_p1d_sandbox', '/neondb') })).toBe('DATABASE_TARGET_MISMATCH');
    const refusal = p1dPreviewRefusalCode({ ...valid, databaseUrl: 'postgresql://user:secret@untrusted.invalid/db' });
    expect(refusal).toBe('DATABASE_TARGET_MISMATCH');
    expect(refusal).not.toContain('secret');
    expect(refusal).not.toContain('untrusted');
  });

  it('must not touch the DB unless gate passes and only run a READ ONLY transaction', () => {
    const src = fs.readFileSync('api/v1/questions/index.ts', 'utf8');
    expect(src).toContain('if (!isP1DPreviewSandboxTarget(');
    expect(src).toContain("if (req.query.__p1d_sandbox_probe === '1')");
    expect(src.indexOf('if (!isP1DPreviewSandboxTarget(')).toBeLessThan(src.indexOf('await client.connect()'));
    expect(src).toContain('return await handleSandboxProbe(res);');
    expect(src).toContain("await client.query('BEGIN READ ONLY')");
    expect(src).toContain("await client.query('ROLLBACK')");
    expect(src).toContain("first?.database_name === P1D_SANDBOX_DATABASE");
    expect(src).toContain("WHERE code = 'PILOT-MAT-8-001'");
    expect(src).toContain("return res.status(sandboxVerified ? 200 : 503).json({ sandboxVerified, readOnly: true });");
    const probe = src.slice(src.indexOf('async function handleSandboxProbe'), src.indexOf('async function handleGet'));
    expect(probe).not.toContain('console.log(');
    expect(probe).not.toContain('req.body');
  });
});
