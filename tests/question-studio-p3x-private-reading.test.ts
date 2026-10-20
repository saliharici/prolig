import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { isP3IsolatedPngUploadEnvironment, P3_ISOLATED_DB_HOST, P3_ISOLATED_STORAGE_URL } from '../api/v1/_lib/p3-png-upload-environment';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  questionLookup: vi.fn(),
  assetLookup: vi.fn(),
  readPng: vi.fn(),
  questionScope: vi.fn(() => ({ id: { gt: 0 } }))
}));
vi.mock('../api/v1/_lib/prisma', () => ({
  prisma: { question: { findFirst: mocks.questionLookup },
    privateGeometryAsset: { findFirst: mocks.assetLookup } }
}));
vi.mock('../api/v1/_lib/current-user', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('../api/v1/_lib/question-access', () => ({ buildQuestionReadScope: mocks.questionScope }));
vi.mock('../api/v1/_lib/p3-png-s3', () => ({
  privateGeometryPngKey: (owner: number, question: number, sha: string) =>
    'authors/' + owner + '/questions/' + question + '/geometry/' + sha + '.png',
  readVerifiedPrivatePng: mocks.readPng
}));
import { handleP3PrivateGeometryRead } from '../api/v1/_lib/p3-png-read-handler';

const sha = 'a'.repeat(64);
const key = 'authors/7/questions/42/geometry/' + sha + '.png';
function response() {
  return {
    code: 0, payload: null as unknown,
    setHeader: vi.fn(),
    status(code: number) { this.code = code; return this; },
    json(value: unknown) { this.payload = value; return this; }
  };
}
function request(options: { question?: string; asset?: number; origin?: string } = {}) {
  return {
    headers: { host: 'private-preview.example', origin: options.origin ?? 'https://private-preview.example',
      'content-type': 'application/json' },
    query: { id: options.question ?? '42' },
    body: { action: 'geometryRead', assetId: options.asset ?? 9 }
  };
}
describe('P3-X private geometry read authorization', () => {
  beforeEach(() => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('VERCEL_GIT_COMMIT_REF', 'feat/p3x-private-image-reading-20261021');
    vi.stubEnv('PROLIG_P3_PNG_UPLOAD_ENABLED', 'true');
    vi.stubEnv('DATABASE_URL', 'postgresql://sample:fake@' + P3_ISOLATED_DB_HOST + '/neondb');
    vi.stubEnv('AWS_ENDPOINT_URL_S3', P3_ISOLATED_STORAGE_URL);
    vi.stubEnv('AWS_REGION', 'eu-central-1');
    vi.stubEnv('AWS_ACCESS_KEY_ID', 'nak_test_key');
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'test_fake');
    mocks.getCurrentUser.mockResolvedValue({ id: 7, role: { code: 'YAZAR' }, status: 'AKTIF' });
    mocks.questionLookup.mockResolvedValue({ id: 42, authorUserId: 7 });
    mocks.assetLookup.mockResolvedValue({ sha256: sha, objectKey: key, width: 1, height: 1, placement: 'STEM' });
    mocks.readPng.mockResolvedValue({ bytes: Buffer.from([1,2,3]), width: 1, height: 1, sha256: sha });
    vi.clearAllMocks();
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('is unavailable unless isolated Preview gates match', () => {
    expect(isP3IsolatedPngUploadEnvironment(process.env)).toBe(true);
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(isP3IsolatedPngUploadEnvironment(process.env)).toBe(false);
  });

  it('returns validated bytes only to an authorized question reader', async () => {
    const res = response();
    await handleP3PrivateGeometryRead(request() as never, res as never);
    expect(res.code).toBe(200);
    expect(res.payload).toMatchObject({ assetId: 9, pngBase64: 'AQID', contentType: 'image/png' });
    expect(mocks.questionScope).toHaveBeenCalled();
    expect(mocks.questionLookup).toHaveBeenCalledWith(expect.objectContaining({
      where: { AND: [{ id: 42 }, { id: { gt: 0 } }] }
    }));
  });

  it('does not fetch bytes without a valid actor and question scope', async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    const res = response();
    await handleP3PrivateGeometryRead(request() as never, res as never);
    expect(res.code).toBe(401);
    expect(mocks.readPng).not.toHaveBeenCalled();
    mocks.questionLookup.mockResolvedValueOnce(null);
    const denied = response();
    await handleP3PrivateGeometryRead(request() as never, denied as never);
    expect(denied.code).toBe(404);
    expect(mocks.assetLookup).not.toHaveBeenCalled();
  });

  it('rejects wrong question binding, wrong owner key or cross-site origin', async () => {
    mocks.assetLookup.mockResolvedValueOnce({ sha256: sha, objectKey: 'authors/8/questions/42/geometry/' + sha + '.png',
      placement: 'STEM' });
    const denied = response();
    await handleP3PrivateGeometryRead(request() as never, denied as never);
    expect(denied.code).toBe(404);
    expect(mocks.readPng).not.toHaveBeenCalled();

    const forged = response();
    await handleP3PrivateGeometryRead(request({ origin: 'https://unrelated.example' }) as never, forged as never);
    expect(forged.code).toBe(403);
  });
});
