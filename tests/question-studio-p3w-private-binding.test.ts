import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  privateGeometryPngKey, signP3PngRead, readVerifiedPrivatePng
} from '../api/v1/_lib/p3-png-s3';
import { issueP3PrivatePngReceipt, verifyP3PrivatePngReceipt } from '../api/v1/_lib/p3-png-receipt';

const cred = { accessKeyId: 'nak_test_key', secretAccessKey: 'fake_for_test' };
const sha = 'b'.repeat(64);

describe('P3-W private image binding safeguards', () => {
  it('binds a receipt only to its original owner and question', () => {
    const issued = 1792541520000;
    const token = issueP3PrivatePngReceipt(11, 22, sha, 'receipt_secret', issued);
    expect(verifyP3PrivatePngReceipt(token, 11, 22, 'receipt_secret', issued + 2000))
      .toEqual({ objectKey: privateGeometryPngKey(11, 22, sha), sha256: sha });
    expect(verifyP3PrivatePngReceipt(token, 11, 23, 'receipt_secret', issued)).toBeNull();
    expect(verifyP3PrivatePngReceipt(token, 19, 22, 'receipt_secret', issued)).toBeNull();
    expect(verifyP3PrivatePngReceipt(token, 11, 22, 'receipt_secret', issued + 700000)).toBeNull();
  });

  it('constructs server-side S3 GET signatures without leaking object credentials', () => {
    const key = privateGeometryPngKey(11, 22, sha);
    const signed = signP3PngRead(key, cred, new Date('2026-10-21T00:10:00Z'));
    expect(signed.url).toContain('prolig-p3-geometry-test/authors/11/questions/22/geometry/');
    expect(signed.headers.authorization).toContain('SignedHeaders=host;x-amz-content-sha256;x-amz-date');
    expect(signed.headers['x-amz-content-sha256']).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(signed)).not.toContain(cred.secretAccessKey);
    expect(() => signP3PngRead('../../etc/passwd', cred)).toThrow();
  });

  it('refuses oversized or missing private objects even from trusted endpoint', async () => {
    const key = privateGeometryPngKey(11, 22, sha);
    const sendOversized = vi.fn(async () => new Response(Buffer.from('oversized'), {
      status: 200, headers: { 'content-length': '9999999' }
    }));
    await expect(readVerifiedPrivatePng(key, sha, cred, sendOversized)).rejects.toThrow();
    const sendMissing = vi.fn(async () => new Response(null, { status: 404 }));
    await expect(readVerifiedPrivatePng(key, sha, cred, sendMissing)).rejects.toThrow();
    const sendInvalid = vi.fn(async () => new Response(Buffer.from('not a png'), { status: 200 }));
    await expect(readVerifiedPrivatePng(key, sha, cred, sendInvalid)).rejects.toThrow();
    await expect(readVerifiedPrivatePng(key, 'c'.repeat(64), cred, sendMissing)).rejects.toThrow();
  });

  it('verifies the metadata model, migration and conditional transaction boundaries', () => {
    const schema = readFileSync('prisma/schema.prisma', 'utf8');
    const migration = readFileSync('prisma/migrations/20261021120000_p3_private_geometry_assets/migration.sql', 'utf8');
    const handler = readFileSync('api/v1/_lib/p3-png-bind-handler.ts', 'utf8');
    const route = readFileSync('api/v1/questions/[id].ts', 'utf8');
    expect(schema).toContain('model PrivateGeometryAsset');
    expect(migration).toContain('ON DELETE CASCADE');
    expect(migration).toContain('CREATE UNIQUE INDEX');
    expect(handler).toContain('isP3IsolatedPngUploadEnvironment(process.env)');
    expect(handler).toContain('verifyGeometryWriteAccess(req, questionId)');
    expect(handler).toContain('verifyP3PrivatePngReceipt(');
    expect(handler).toContain('readVerifiedPrivatePng(receipt.objectKey, receipt.sha256');
    expect(handler).toContain('await tx.question.updateMany(');
    expect(handler).toContain('updatedAt: new Date(access.questionUpdatedAt)');
    expect(handler).toContain('if (updated.count !== 1) throw new Error');
    expect(handler).toContain('tx.privateGeometryAsset.upsert({');
    expect(handler.indexOf('tx.question.updateMany')).toBeLessThan(handler.indexOf('tx.privateGeometryAsset.upsert'));
    expect(route).toContain("req.body?.action === 'geometryBind'");
    expect(handler).not.toContain('publicUrl:');
  });
});
