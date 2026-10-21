import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { P3_ISOLATED_DB_HOST, P3_ISOLATED_STORAGE_URL } from '../api/v1/_lib/p3-png-upload-environment';
import { verifyAndNormalizeGeometryPng } from '../api/v1/_lib/geometry-png-validation';

const mocks = vi.hoisted(() => ({
  access: vi.fn(), archive: vi.fn(),
  put: vi.fn(), read: vi.fn(), getCurrentUser: vi.fn(),
  questionLookup: vi.fn(), assetLookup: vi.fn(), list: vi.fn(),
  update: vi.fn(), findUnique: vi.fn(), count: vi.fn(), upsert: vi.fn(),
  scope: vi.fn(() => ({ id: { gt: 0 } }))
}));
vi.mock('../api/v1/_lib/geometry-write-access', () => ({
  verifyGeometryWriteAccess: mocks.access
}));
vi.mock('../api/v1/_lib/question-archive', () => ({ isQuestionArchived: mocks.archive }));
vi.mock('../api/v1/_lib/auth', () => ({ getSecret: () => 'isolated_mock_receipt_secret' }));
vi.mock('../api/v1/_lib/current-user', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('../api/v1/_lib/question-access', () => ({ buildQuestionReadScope: mocks.scope }));
vi.mock('../api/v1/_lib/p3-png-s3', () => ({
  privateGeometryPngKey: (ownerId: number, questionId: number, sha: string) =>
    'authors/' + ownerId + '/questions/' + questionId + '/geometry/' + sha + '.png',
  putVerifiedPngInPrivateBucket: mocks.put,
  readVerifiedPrivatePng: mocks.read
}));
vi.mock('../api/v1/_lib/prisma', () => ({
  prisma: {
    $transaction: (callback: (tx: unknown) => unknown) => callback({
      question: { updateMany: mocks.update },
      privateGeometryAsset: {
        findUnique: mocks.findUnique, count: mocks.count, upsert: mocks.upsert
      }
    }),
    question: { findFirst: mocks.questionLookup },
    privateGeometryAsset: { findMany: mocks.list, findFirst: mocks.assetLookup }
  }
}));
import { handleP3IsolatedGeometryUpload } from '../api/v1/_lib/p3-png-upload-handler';
import { handleP3PrivateGeometryBind } from '../api/v1/_lib/p3-png-bind-handler';
import { handleP3PrivateGeometryList } from '../api/v1/_lib/p3-png-list-handler';
import { handleP3PrivateGeometryRead } from '../api/v1/_lib/p3-png-read-handler';

const revision = '2026-10-21T00:01:00.000Z';
const keyFor = (sha: string) => 'authors/7/questions/42/geometry/' + sha + '.png';

function crc32(bytes: Buffer) {
  let n = 0xffffffff;
  for (const byte of bytes) {
    n ^= byte;
    for (let k = 0; k < 8; k += 1) n = (n >>> 1) ^ ((n & 1) ? 0xedb88320 : 0);
  }
  return (n ^ 0xffffffff) >>> 0;
}
function chunk(name: string, body: Buffer) {
  const b = Buffer.alloc(12 + body.length), tag = Buffer.from(name);
  b.writeUInt32BE(body.length, 0);
  tag.copy(b, 4);
  body.copy(b, 8);
  b.writeUInt32BE(crc32(Buffer.concat([tag, body])), body.length + 8);
  return b;
}
const candidate = Buffer.concat([
  Buffer.from([137,80,78,71,13,10,26,10]),
  chunk('IHDR', Buffer.from([0,0,0,1,0,0,0,1,8,6,0,0,0])),
  chunk('IDAT', deflateSync(Buffer.from([0,33,66,99,255]))),
  chunk('IEND', Buffer.alloc(0))
]);
const verifiedPng = verifyAndNormalizeGeometryPng(candidate);

function req(action: string, extra: Record<string, unknown> = {}) {
  return {
    method: 'POST', query: { id: '42' },
    headers: { host: 'qa-preview.example', origin: 'https://qa-preview.example',
      'content-type': 'application/json', 'content-length': '222' },
    body: { action, ...extra }
  };
}
function res() {
  return {
    code: 0,
    data: null as Record<string, unknown> | null,
    setHeader: vi.fn(),
    status(n: number) { this.code = n; return this; },
    json(x: Record<string, unknown>) { this.data = x; return this; }
  };
}

describe('P3-AB upload → verified receipt bind → metadata list → private read (isolated mock)', () => {
  beforeEach(() => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('VERCEL_GIT_COMMIT_REF', 'feat/p3ab-private-geometry-acceptance-20261021');
    vi.stubEnv('PROLIG_P3_PNG_UPLOAD_ENABLED', 'true');
    vi.stubEnv('DATABASE_URL', 'postgresql://qa:fake@' + P3_ISOLATED_DB_HOST + '/neondb');
    vi.stubEnv('AWS_ENDPOINT_URL_S3', P3_ISOLATED_STORAGE_URL);
    vi.stubEnv('AWS_REGION', 'eu-central-1');
    vi.stubEnv('AWS_ACCESS_KEY_ID', 'nak_example_mock');
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'test_secret_mock');

    mocks.access.mockResolvedValue({
      allowed: true, ownerUserId: 7, questionId: 42,
      questionStatus: 'TASLAK', questionUpdatedAt: revision
    });
    mocks.archive.mockResolvedValue(false);
    mocks.put.mockResolvedValue(undefined);
    mocks.read.mockResolvedValue(verifiedPng);
    mocks.getCurrentUser.mockResolvedValue({ id: 7, role: { code: 'YAZAR' }, status: 'AKTIF' });
    mocks.questionLookup.mockResolvedValue({ id: 42, authorUserId: 7 });
    mocks.assetLookup.mockResolvedValue({
      sha256: verifiedPng.sha256, objectKey: keyFor(verifiedPng.sha256),
      width: 1, height: 1, placement: 'STEM'
    });
    mocks.list.mockResolvedValue([{
      id: 55, sha256: verifiedPng.sha256, width: 1, height: 1,
      createdAt: new Date('2026-10-21T10:00:00.000Z')
    }]);
    mocks.update.mockResolvedValue({ count: 1 });
    mocks.findUnique.mockResolvedValue(null);
    mocks.count.mockResolvedValue(0);
    mocks.upsert.mockResolvedValue({
      id: 55, sha256: verifiedPng.sha256, width: 1, height: 1, placement: 'STEM'
    });
    vi.clearAllMocks();
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('moves a verified PNG through four separate server actions without a public S3 URL', async () => {
    const uploaded = res();
    await handleP3IsolatedGeometryUpload(
      req('geometryUpload', { pngBase64: candidate.toString('base64'), expectedUpdatedAt: revision }) as never,
      uploaded as never
    );
    expect(uploaded.code).toBe(201);
    expect(uploaded.data).toMatchObject({ storedPrivate: true, linkedToQuestion: false });
    expect(mocks.put).toHaveBeenCalledWith(keyFor(verifiedPng.sha256), verifiedPng.bytes,
      expect.objectContaining({ accessKeyId: 'nak_example_mock' }));
    const receipt = uploaded.data?.receipt;
    expect(typeof receipt).toBe('string');

    const bound = res();
    await handleP3PrivateGeometryBind(
      req('geometryBind', { receipt, expectedUpdatedAt: revision }) as never, bound as never
    );
    expect(bound.code).toBe(200);
    expect(bound.data).toMatchObject({ linkedToQuestion: true, questionId: 42 });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 42, authorUserId: 7, updatedAt: new Date(revision) })
    }));
    expect(mocks.count).toHaveBeenCalledWith({ where: { questionId: 42 } });

    const listed = res();
    await handleP3PrivateGeometryList(req('geometryList') as never, listed as never);
    expect(listed.code).toBe(200);
    expect(listed.data).toMatchObject({
      questionId: 42, images: [{ assetId: 55, width: 1, height: 1 }]
    });

    const read = res();
    await handleP3PrivateGeometryRead(req('geometryRead', { assetId: 55 }) as never, read as never);
    expect(read.code).toBe(200);
    expect(read.data).toMatchObject({
      assetId: 55, contentType: 'image/png', pngBase64: verifiedPng.bytes.toString('base64')
    });
    expect(mocks.read).toHaveBeenCalledWith(keyFor(verifiedPng.sha256), verifiedPng.sha256,
      expect.objectContaining({ accessKeyId: 'nak_example_mock' }));
    for (const result of [uploaded, bound, listed, read]) {
      expect(JSON.stringify(result.data)).not.toContain('AWS_SECRET_ACCESS_KEY');
      expect(JSON.stringify(result.data)).not.toContain('https://br-misty-base');
    }
  });

  it('refuses the 31st distinct image inside the guarded transaction', async () => {
    mocks.count.mockResolvedValueOnce(30);
    const receipt = (await import('../api/v1/_lib/p3-png-receipt'))
      .issueP3PrivatePngReceipt(7, 42, verifiedPng.sha256, 'isolated_mock_receipt_secret');
    const response = res();
    await handleP3PrivateGeometryBind(req('geometryBind', { receipt, expectedUpdatedAt: revision }) as never,
      response as never);
    expect(response.code).toBe(409);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it('permits idempotent same-image reattachment at the cap', async () => {
    mocks.count.mockResolvedValueOnce(30);
    mocks.findUnique.mockResolvedValueOnce({ id: 55 });
    const receipt = (await import('../api/v1/_lib/p3-png-receipt'))
      .issueP3PrivatePngReceipt(7, 42, verifiedPng.sha256, 'isolated_mock_receipt_secret');
    const response = res();
    await handleP3PrivateGeometryBind(req('geometryBind', { receipt, expectedUpdatedAt: revision }) as never,
      response as never);
    expect(response.code).toBe(200);
    expect(mocks.count).not.toHaveBeenCalled();
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
  });

  it('rejects stale revisions and unauthorized upload before any private storage write', async () => {
    const outdated = res();
    await handleP3IsolatedGeometryUpload(req('geometryUpload',
      { pngBase64: candidate.toString('base64'), expectedUpdatedAt: '2025-01-01T00:00:00Z' }
    ) as never, outdated as never);
    expect(outdated.code).toBe(409);
    expect(mocks.put).not.toHaveBeenCalled();

    mocks.access.mockResolvedValueOnce({ allowed: false });
    const rejected = res();
    await handleP3IsolatedGeometryUpload(req('geometryUpload',
      { pngBase64: candidate.toString('base64'), expectedUpdatedAt: revision }
    ) as never, rejected as never);
    expect(rejected.code).toBe(403);
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it('is always unavailable to production and invalid PNG uploads', async () => {
    const invalid = res();
    await handleP3IsolatedGeometryUpload(req('geometryUpload',
      { pngBase64: Buffer.from('<svg/>').toString('base64'), expectedUpdatedAt: revision }
    ) as never, invalid as never);
    expect(invalid.code).toBe(415);
    expect(mocks.put).not.toHaveBeenCalled();

    vi.stubEnv('VERCEL_ENV', 'production');
    const blocked = res();
    await handleP3PrivateGeometryRead(req('geometryRead', { assetId: 55 }) as never, blocked as never);
    expect(blocked.code).toBe(404);
    expect(mocks.read).not.toHaveBeenCalled();
  });
});
