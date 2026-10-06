import { describe, it, expect } from 'vitest';
import { buildQuestionReadScope, canWorkflowSubmit, canWorkflowReview } from '../api/v1/_lib/question-access.js';

describe('Question Access Scope', () => {
  it('GENEL sees all', () => {
    expect(buildQuestionReadScope({ role: { code: 'GENEL_KOORDINATOR' } })).toEqual({});
  });

  it('BOLGE restricted to assignedRegion', () => {
    expect(buildQuestionReadScope({ role: { code: 'BOLGE_KOORDINATORU' }, assignedRegion: 'Marmara' })).toEqual({
      authorUser: { province: { region: 'Marmara' } }
    });
    expect(buildQuestionReadScope({ role: { code: 'BOLGE_KOORDINATORU' } })).toEqual({ id: -1 }); // Fail closed
  });

  it('IL restricted to provinceId', () => {
    expect(buildQuestionReadScope({ role: { code: 'IL_KOORDINATORU' }, provinceId: 34 })).toEqual({
      authorUser: { provinceId: 34 }
    });
    expect(buildQuestionReadScope({ role: { code: 'IL_KOORDINATORU' } })).toEqual({ id: -1 });
  });

  it('EDITOR restricted to editorBranchId', () => {
    expect(buildQuestionReadScope({ role: { code: 'EDITOR' }, editorBranchId: 1 })).toEqual({
      authorUser: { AuthorProfile: { branchId: 1 } }
    });
    expect(buildQuestionReadScope({ role: { code: 'EDITOR' }, editorBranchId: 1, editorGrade: '8. Sınıf' })).toEqual({
      authorUser: { AuthorProfile: { branchId: 1 } },
      grade: '8. Sınıf'
    });
    expect(buildQuestionReadScope({ role: { code: 'EDITOR' } })).toEqual({ id: -1 });
  });

  it('YAZAR sees only own', () => {
    expect(buildQuestionReadScope({ role: { code: 'YAZAR' }, id: 5 })).toEqual({ authorUserId: 5 });
  });

  it('MUHASEBE denied', () => {
    expect(buildQuestionReadScope({ role: { code: 'MUHASEBE' } })).toEqual({ id: -1 });
  });
});

describe('Workflow Permissions', () => {
  it('YAZAR can submit TASLAK or REVIZYON', () => {
    const user = { role: { code: 'YAZAR' }, id: 1 };
    expect(canWorkflowSubmit({ authorUserId: 1, status: 'TASLAK' }, user)).toBe(true);
    expect(canWorkflowSubmit({ authorUserId: 1, status: 'REVIZYON' }, user)).toBe(true);
    expect(canWorkflowSubmit({ authorUserId: 1, status: 'INCELEMEDE' }, user)).toBe(false);
    expect(canWorkflowSubmit({ authorUserId: 2, status: 'TASLAK' }, user)).toBe(false); // Non-owner
  });

  it('EDITOR review constraints', () => {
    const editor = { role: { code: 'EDITOR' }, editorBranchId: 1 };
    expect(canWorkflowReview({ authorUser: { AuthorProfile: { branchId: 1 } } }, editor)).toBe(true);
    expect(canWorkflowReview({ authorUser: { AuthorProfile: { branchId: 2 } } }, editor)).toBe(false); // Wrong branch
    
    const strictEditor = { role: { code: 'EDITOR' }, editorBranchId: 1, editorGrade: '8. Sınıf' };
    expect(canWorkflowReview({ grade: '8. Sınıf', authorUser: { AuthorProfile: { branchId: 1 } } }, strictEditor)).toBe(true);
    expect(canWorkflowReview({ grade: '7. Sınıf', authorUser: { AuthorProfile: { branchId: 1 } } }, strictEditor)).toBe(false); // Wrong grade
  });

  it('GENEL can always review', () => {
    expect(canWorkflowReview({}, { role: { code: 'GENEL_KOORDINATOR' } })).toBe(true);
  });
});
