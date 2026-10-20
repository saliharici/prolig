import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
// Prevent the application Prisma singleton from requiring a real DATABASE_URL.
vi.mock('../api/v1/_lib/prisma', () => ({ prisma: {} }));
import { bookApiPreviewEnabled } from '../api/v1/_lib/book-handler';
import { P3_ISOLATED_DB_HOST, P3_ISOLATED_STORAGE_URL } from '../api/v1/_lib/p3-png-upload-environment';

const testEnv = {
  NODE_ENV: 'production', VERCEL_ENV: 'preview',
  VERCEL_GIT_COMMIT_REF: 'feat/p3z-private-png-book-integration-20261021',
  PROLIG_BOOKS_V2_ENABLED: 'true', PROLIG_P3_BOOK_EXPORT_ENABLED: 'true',
  PROLIG_P3_PNG_UPLOAD_ENABLED: 'true',
  DATABASE_URL: 'postgresql://test:secret@' + P3_ISOLATED_DB_HOST + '/neondb',
  AWS_ENDPOINT_URL_S3: P3_ISOLATED_STORAGE_URL, AWS_REGION: 'eu-central-1',
  AWS_ACCESS_KEY_ID: 'nak_test_credentials', AWS_SECRET_ACCESS_KEY: 'test_only'
};

describe('P3-Z guarded private image Word integration', () => {
  it('allows books on the explicitly isolated preview, never on production', () => {
    expect(bookApiPreviewEnabled(testEnv)).toBe(true);
    expect(bookApiPreviewEnabled({ ...testEnv, VERCEL_ENV: 'production' })).toBe(false);
    expect(bookApiPreviewEnabled({ ...testEnv, PROLIG_P3_BOOK_EXPORT_ENABLED: 'false' })).toBe(false);
    expect(bookApiPreviewEnabled({ ...testEnv, DATABASE_URL: 'postgresql://x:y@elsewhere.neon.tech/neondb' })).toBe(false);
    expect(bookApiPreviewEnabled({ ...testEnv, VERCEL_GIT_COMMIT_REF: 'main' })).toBe(false);
  });

  it('freezes asset references inside the exact book snapshot from server DB', () => {
    const code = readFileSync('api/v1/_lib/book-handler.ts', 'utf8');
    expect(code).toContain('const isolatedGeometry = isP3IsolatedPngUploadEnvironment(process.env)');
    expect(code).toContain('privateGeometryAssets: { select:');
    expect(code).toContain('draft = prepareBookDraft(user.role.code, body, dtoQuestions)');
    expect(code).toContain('item.snapshot.privateGeometryAssets = images.map(');
    expect(code).toContain('if (imageCount > 30)');
  });

  it('rechecks frozen question revision, ownership and object identity for Word export', () => {
    const code = readFileSync('api/v1/_lib/book-handler.ts', 'utf8');
    expect(code).toContain("status: 'ONAYLANDI'");
    expect(code).toContain('question.updatedAt.toISOString() !== ref.frozenUpdatedAt');
    expect(code).toContain('asset.ownerUserId !== question.authorUserId');
    expect(code).toContain('asset.questionId !== ref.sourceQuestionId');
    expect(code).toContain('asset.objectKey !== privateGeometryPngKey(');
    expect(code).toContain('readVerifiedPrivatePng(asset.objectKey, asset.sha256,');
    expect(code).toContain('exportBookDocxWithVerifiedPrivateGeometry(book, answers');
    expect(code).not.toContain('req.body.privateGeometryAssets');
  });
});
