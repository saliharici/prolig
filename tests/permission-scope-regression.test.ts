import { describe, expect, it } from 'vitest';
import { buildAuthorReadScope } from '../api/v1/_lib/author-access.js';
import { buildProjectReadScope } from '../api/v1/_lib/project-access.js';
import { buildQuestionReadScope, canWorkflowReview } from '../api/v1/_lib/question-access.js';

const role = (code: string) => ({ code });

describe('P0 permission scope regression contracts', () => {
  it('YAZAR can query only their own author profile', () => {
    expect(buildAuthorReadScope({ id: 14, role: role('YAZAR'), AuthorProfile: { id: 23 } }))
      .toEqual({ id: 23 });
    expect(buildAuthorReadScope({ id: 14, role: role('YAZAR'), AuthorProfile: null }))
      .toEqual({ id: -1 });
  });

  it('EDITOR with no branch or geography fails closed', () => {
    expect(buildAuthorReadScope({ role: role('EDITOR'), editorBranchId: 7 }))
      .toEqual({ id: -1 });
    expect(buildQuestionReadScope({ role: role('EDITOR'), provinceId: 34 }))
      .toEqual({ id: -1 });
    expect(buildProjectReadScope({ role: role('EDITOR'), editorBranchId: 7 }))
      .toEqual({ id: -1 });
  });

  it('EDITOR author and question read scopes combine branch and province', () => {
    const editor = { role: role('EDITOR'), editorBranchId: 7, provinceId: 34, editorGrade: '8. Sınıf' };
    expect(buildAuthorReadScope(editor)).toEqual({ branchId: { in: [7] }, provinceId: 34 });
    expect(buildQuestionReadScope(editor)).toEqual({
      authorUser: { AuthorProfile: { branchId: { in: [7] }, provinceId: 34 } },
      grade: '8. Sınıf'
    });
  });

  it('EDITOR cannot approve a different grade, branch or geography', () => {
    const editor = { role: role('EDITOR'), editorBranchId: 7, provinceId: 34, editorGrade: '8. Sınıf' };
    const question = { grade: '8. Sınıf', authorUser: { AuthorProfile: { branchId: 7, provinceId: 34 } } };
    expect(canWorkflowReview(question, editor)).toBe(true);
    expect(canWorkflowReview({ ...question, grade: '7. Sınıf' }, editor)).toBe(false);
    expect(canWorkflowReview({ ...question, authorUser: { AuthorProfile: { branchId: 8, provinceId: 34 } } }, editor)).toBe(false);
    expect(canWorkflowReview({ ...question, authorUser: { AuthorProfile: { branchId: 7, provinceId: 6 } } }, editor)).toBe(false);
  });

  it('IL coordinator project visibility follows project author province', () => {
    expect(buildProjectReadScope({ id: 8, role: role('IL_KOORDINATORU'), provinceId: 34 }))
      .toEqual({
        OR: [
          { coordinatorId: 8 },
          { projectAuthors: { some: { authorProfile: { provinceId: 34 } } } }
        ]
      });
  });
});
