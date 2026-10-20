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
    expect(source).not.toContain('presign');
    expect(source).not.toContain('prisma.question.update');
    expect(source).not.toContain('prisma.questionAsset.create');
    expect(canModifyQuestionGeometry(null, null)).toBe(false);
  });
});
