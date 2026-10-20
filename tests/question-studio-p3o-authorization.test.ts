import { describe, expect, it } from 'vitest';
import { canModifyQuestionGeometry } from '../api/v1/_lib/geometry-authorization';
const actor = { id: 8, role: { code: 'YAZAR' }, status: 'AKTIF' };
const question = { id: 42, authorUserId: 8, status: 'TASLAK' };
describe('P3-O ownership gate', () => {
  it('allows active author of own editable question', () => {
    expect(canModifyQuestionGeometry(actor, question)).toBe(true);
    expect(canModifyQuestionGeometry(actor, { ...question, status: 'REVIZYON' })).toBe(true);
  });
  it('rejects other users, roles, statuses, unauthenticated access', () => {
    expect(canModifyQuestionGeometry({ ...actor, id: 9 }, question)).toBe(false);
    expect(canModifyQuestionGeometry({ ...actor, status: 'PASIF' }, question)).toBe(false);
    expect(canModifyQuestionGeometry({ ...actor, role: { code: 'GENEL_KOORDINATOR' } }, question)).toBe(false);
    expect(canModifyQuestionGeometry(actor, { ...question, status: 'ONAYLANDI' })).toBe(false);
    expect(canModifyQuestionGeometry(null, question)).toBe(false);
    expect(canModifyQuestionGeometry(actor, null)).toBe(false);
  });
});
