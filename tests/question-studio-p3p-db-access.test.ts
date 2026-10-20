import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { canModifyQuestionGeometry } from '../api/v1/_lib/geometry-authorization';

describe('P3-P database-backed geometry authorization preflight', () => {
  const source = readFileSync('api/v1/_lib/geometry-write-access.ts', 'utf8');
  it('reads session identity and owner-scoped question from server database', () => {
    expect(source).toContain('getCurrentUser(req)');
    expect(source).toContain('prisma.question.findFirst');
    expect(source).toContain('authorUserId: user.id');
    expect(source).toContain('canModifyQuestionGeometry(user, question)');
  });
  it('keeps the preflight read-only and deny-by-default', () => {
    // Verify actual calls, not documentation such as 'does not create a presigned URL'.
    const executableSource = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    expect(executableSource).not.toMatch(/\b(?:presign|getSignedUrl|createPresignedPost)\s*\(/);
    expect(executableSource).not.toMatch(/\bprisma\.(?:question|questionAsset)\.(?:create|update|upsert|delete|updateMany|deleteMany)\s*\(/);
    expect(canModifyQuestionGeometry(null, null)).toBe(false);
  });
});
