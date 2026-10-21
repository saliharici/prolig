import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { P3_ISOLATED_DB_HOST, P3_ISOLATED_STORAGE_URL } from '../api/v1/_lib/p3-png-upload-environment';

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  assets: vi.fn()
}));
vi.mock('../api/v1/_lib/prisma', () => ({
  prisma: { privateGeometryAsset: { findMany: mocks.assets } }
}));
vi.mock('../api/v1/_lib/geometry-write-access', () => ({
  verifyGeometryWriteAccess: mocks.access
}));
import { handleP3PrivateGeometryList } from '../api/v1/_lib/p3-png-list-handler';

function request(origin = 'https://p3-preview.example') {
  return {
    method: 'POST',
    query: { id: '42' },
    body: { action: 'geometryList' },
    headers: { host: 'p3-preview.example', origin, 'content-type': 'application/json' }
  };
}
function response() {
  return {
    code: 0, value: null as unknown, headers: {} as Record<string,string>,
    setHeader(key: string, value: string) { this.headers[key] = value; return this; },
    status(code: number) { this.code = code; return this; },
    json(value: unknown) { this.value = value; return this; }
  };
}

describe('P3-AA private PNG studio listing', () => {
  beforeEach(() => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('VERCEL_GIT_COMMIT_REF', 'feat/p3z-private-png-book-integration-20261021');
    vi.stubEnv('DATABASE_URL', 'postgresql://test:fake@' + P3_ISOLATED_DB_HOST + '/neondb');
    vi.stubEnv('AWS_ENDPOINT_URL_S3', P3_ISOLATED_STORAGE_URL);
    vi.stubEnv('AWS_REGION', 'eu-central-1');
    vi.stubEnv('AWS_ACCESS_KEY_ID', 'nak_fake_test');
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'fake_test_key');
    vi.stubEnv('PROLIG_P3_PNG_UPLOAD_ENABLED', 'true');
    mocks.access.mockResolvedValue({
      allowed: true, questionId: 42, ownerUserId: 7, questionStatus: 'TASLAK',
      questionUpdatedAt: '2026-10-21T00:00:00.000Z'
    });
    mocks.assets.mockResolvedValue([
      { id: 9, sha256: 'a'.repeat(64), width: 24, height: 35, createdAt: new Date('2026-10-21T01:00:00Z') }
    ]);
    vi.clearAllMocks();
  });
  afterEach(() => vi.unstubAllEnvs());

  it('returns safe metadata only for owner-scoped editable question', async () => {
    const res = response();
    await handleP3PrivateGeometryList(request() as never, res as never);
    expect(res.code).toBe(200);
    expect(res.value).toMatchObject({
      questionId: 42,
      images: [{ assetId: 9, width: 24, height: 35 }]
    });
    expect(mocks.assets).toHaveBeenCalledWith(expect.objectContaining({
      where: { questionId: 42, ownerUserId: 7, placement: 'STEM' },
      take: 31
    }));
    expect(JSON.stringify(res.value)).not.toContain('objectKey');
    expect(JSON.stringify(res.value)).not.toContain('AWS_SECRET');
  });

  it('blocks non-owner, production and cross-origin requests', async () => {
    mocks.access.mockResolvedValueOnce({ allowed: false });
    const denied = response();
    await handleP3PrivateGeometryList(request() as never, denied as never);
    expect(denied.code).toBe(403);
    expect(mocks.assets).not.toHaveBeenCalled();
    const origin = response();
    await handleP3PrivateGeometryList(request('https://external.example') as never, origin as never);
    expect(origin.code).toBe(403);
    vi.stubEnv('VERCEL_ENV','production');
    const prod = response();
    await handleP3PrivateGeometryList(request() as never, prod as never);
    expect(prod.code).toBe(404);
  });

  it('shows custom shape controls on new questions without bypassing save-first security', () => {
    const source = readFileSync('src/questions/GuidedQuestionStudio.tsx', 'utf8');
    expect(source).toContain('Özel şekil ekle');
    expect(source).toContain('Özel PNG yüklemesi için önce soru taslağını kaydedin.');
    expect(source).toContain("onClick={() => onStepChange(5)}");
    expect(source).toContain('editing && privateGeometryQuestionId && privateGeometryUpdatedAt && onPrivateGeometryRevision');
    expect(source).toContain('<PrivateGeometryWorkspace questionId={privateGeometryQuestionId}');
    expect(source).toContain('onPreviewChange={image =>');
    expect(source).not.toContain('privateGeometryEnabled && editing && privateGeometryQuestionId');
  });

  it('rehydrates the private PNG under the question stem in author preview', () => {
    const workspace = readFileSync('src/questions/PrivateGeometryWorkspace.tsx', 'utf8');
    const studio = readFileSync('src/questions/GuidedQuestionStudio.tsx', 'utf8');
    const docx = readFileSync('api/v1/_lib/book-docx.ts', 'utf8');
    expect(workspace).toContain("const first = result.images[0]");
    expect(workspace).toContain("'geometryRead', { assetId: first.assetId }");
    expect(workspace).toContain('onPreviewChange?.({');
    expect(workspace).toContain('safePrivatePngDataUrl');
    expect(studio).toContain('privateStemImage?.questionId === privateGeometryQuestionId');
    expect(studio).toContain('renderAssets={renderPreviewAssets}');
    expect(studio).toContain('onPreviewChange={image =>');
    expect(docx).toContain('body.push(privatePngWordDrawing(image, drawings.nextId++))');
    // Private credentials and storage object keys never cross to the React view.
    expect(studio).not.toContain('AWS_SECRET_ACCESS_KEY');
    expect(studio).not.toContain('objectKey');
  });

  it('has browser upload, signed receipt bind, scoped read and revision callback', () => {
    const client = readFileSync('src/questions/PrivateGeometryWorkspace.tsx','utf8');
    const guide = readFileSync('src/questions/GuidedQuestionStudio.tsx','utf8');
    const demo = readFileSync('src/DemoApp.tsx','utf8');
    const route = readFileSync('api/v1/questions/[id].ts','utf8');
    for(const action of ['geometryUpload','geometryBind','geometryList','geometryRead']) {
      expect(client).toContain("'" + action + "'");
    }
    expect(client).toContain('onRevisionChange(bound.updatedAt)');
    expect(guide).toContain('<PrivateGeometryWorkspace');
    expect(demo).toContain('privateGeometryQuestionId={editingQuestion?.id ?? null}');
    expect(route).toContain("req.body?.action === 'geometryList'");
  });
});
