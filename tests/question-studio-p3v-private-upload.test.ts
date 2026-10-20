import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  isP3IsolatedPngUploadEnvironment,
  P3_ISOLATED_DB_HOST,
  P3_ISOLATED_STORAGE_URL,
  P3_PNG_PREVIEW_BRANCH
} from '../api/v1/_lib/p3-png-upload-environment';
import {
  privateGeometryPngKey, signP3PngUpload, putVerifiedPngInPrivateBucket
} from '../api/v1/_lib/p3-png-s3';
import { issueP3PrivatePngReceipt, verifyP3PrivatePngReceipt } from '../api/v1/_lib/p3-png-receipt';

const isolatedEnv = {
  VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: P3_PNG_PREVIEW_BRANCH,
  PROLIG_P3_PNG_UPLOAD_ENABLED: 'true',
  DATABASE_URL: 'postgresql://sample:private@' + P3_ISOLATED_DB_HOST + '/neondb',
  AWS_ENDPOINT_URL_S3: P3_ISOLATED_STORAGE_URL, AWS_REGION: 'eu-central-1',
  AWS_ACCESS_KEY_ID: 'nak_example_for_unit_test', AWS_SECRET_ACCESS_KEY: 'fake_test_secret'
};
const sha = 'a'.repeat(64);
const png = Buffer.from('test bytes only');

describe('P3-V Preview-only private PNG upload gate', () => {
  it('permits exclusively dedicated isolated Preview with explicit secret config', () => {
    expect(isP3IsolatedPngUploadEnvironment(isolatedEnv)).toBe(true);
    expect(isP3IsolatedPngUploadEnvironment({ ...isolatedEnv, VERCEL_ENV: 'production' })).toBe(false);
    expect(isP3IsolatedPngUploadEnvironment({ ...isolatedEnv, VERCEL_GIT_COMMIT_REF: 'main' })).toBe(false);
    expect(isP3IsolatedPngUploadEnvironment({ ...isolatedEnv, PROLIG_P3_PNG_UPLOAD_ENABLED: 'false' })).toBe(false);
    expect(isP3IsolatedPngUploadEnvironment({ ...isolatedEnv, DATABASE_URL: 'postgresql://a:b@production.neon.tech/neondb' })).toBe(false);
    expect(isP3IsolatedPngUploadEnvironment({ ...isolatedEnv, AWS_ENDPOINT_URL_S3: 'https://attacker.example' })).toBe(false);
    expect(isP3IsolatedPngUploadEnvironment({ ...isolatedEnv, AWS_SECRET_ACCESS_KEY: '' })).toBe(false);
  });

  it('signs a bounded owner+question scoped private S3 PutObject request deterministically', () => {
    const key = privateGeometryPngKey(8, 42, sha);
    const signed = signP3PngUpload(key, png, {
      accessKeyId: 'nak_test_key', secretAccessKey: 'private_fake_for_test'
    }, new Date('2026-10-21T00:12:00.000Z'));
    expect(signed.url).toBe(P3_ISOLATED_STORAGE_URL + '/prolig-p3-geometry-test/' + key);
    expect(signed.headers.authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=nak_test_key\/20261021\/eu-central-1\/s3\/aws4_request/);
    expect(signed.headers['x-amz-content-sha256']).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(signed)).not.toContain('private_fake_for_test');
    expect(() => privateGeometryPngKey(0, 42, sha)).toThrow();
    expect(() => privateGeometryPngKey(8, 42, '../a.png')).toThrow();
    expect(() => signP3PngUpload('../evil.png', png, { accessKeyId: 'nak_test_key', secretAccessKey: 'fake' })).toThrow();
  });

  it('uploads only to the private bucket and rejects upstream failure', async () => {
    const send = vi.fn(async () => new Response(null, { status: 200 }));
    await putVerifiedPngInPrivateBucket(privateGeometryPngKey(7, 18, sha), png,
      { accessKeyId: 'nak_test_key', secretAccessKey: 'fake' }, send);
    expect(send).toHaveBeenCalledTimes(1);
    const [url, options] = send.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/authors/7/questions/18/geometry/');
    expect(options.method).toBe('PUT');
    expect(options.headers).toHaveProperty('authorization');
    const reject = vi.fn(async () => new Response(null, { status: 403 }));
    await expect(putVerifiedPngInPrivateBucket(privateGeometryPngKey(7, 18, sha), png,
      { accessKeyId: 'nak_test_key', secretAccessKey: 'fake' }, reject)).rejects.toThrow();
  });

  it('binds a short-lived receipt to owner, question, checksum and secret', () => {
    const time = 1792541520000;
    const receipt = issueP3PrivatePngReceipt(8, 42, sha, 'test_secret_only', time);
    expect(verifyP3PrivatePngReceipt(receipt, 8, 42, 'test_secret_only', time + 60_000)).toEqual({
      objectKey: privateGeometryPngKey(8, 42, sha), sha256: sha
    });
    expect(verifyP3PrivatePngReceipt(receipt, 9, 42, 'test_secret_only', time)).toBeNull();
    expect(verifyP3PrivatePngReceipt(receipt, 8, 43, 'test_secret_only', time)).toBeNull();
    expect(verifyP3PrivatePngReceipt(receipt, 8, 42, 'different_secret', time)).toBeNull();
    expect(verifyP3PrivatePngReceipt(receipt, 8, 42, 'test_secret_only', time + 600_001)).toBeNull();
    expect(verifyP3PrivatePngReceipt(receipt.slice(0, -1) + '0', 8, 42, 'test_secret_only', time)).toBeNull();
  });

  it('uses DB ownership and revision checks before storage, without exposing private URL', () => {
    const handler = readFileSync('api/v1/_lib/p3-png-upload-handler.ts', 'utf8');
    const route = readFileSync('api/v1/questions/[id].ts', 'utf8');
    expect(handler).toContain('verifyGeometryWriteAccess(req, questionId)');
    expect(handler).toContain('access.questionUpdatedAt !== body.expectedUpdatedAt');
    expect(handler).toContain('await isQuestionArchived(questionId)');
    expect(handler).toContain('req.headers.origin');
    expect(handler).toContain('verifyAndNormalizeGeometryPng(encodedPng)');
    expect(handler).toContain('linkedToQuestion: false');
    expect(route).toContain("req.body?.action === 'geometryUpload'");
    expect(handler).not.toContain('res.redirect(');
  });
});
