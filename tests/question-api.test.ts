import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildQuestionReadScope, canWorkflowReview } from '../api/v1/_lib/question-access.js';

describe('Question Access Scope', () => {
  it('GENEL sees all', () => {
    expect(buildQuestionReadScope({ role: { code: 'GENEL_KOORDINATOR' } })).toEqual({});
  });

  it('BOLGE restricted to assignedRegion using AuthorProfile', () => {
    expect(buildQuestionReadScope({ role: { code: 'BOLGE_KOORDINATORU' }, assignedRegion: 'Marmara' })).toEqual({
      authorUser: { AuthorProfile: { province: { region: 'Marmara' } } }
    });
    expect(buildQuestionReadScope({ role: { code: 'BOLGE_KOORDINATORU' } })).toEqual({ id: -1 });
  });

  it('IL restricted to provinceId using AuthorProfile', () => {
    expect(buildQuestionReadScope({ role: { code: 'IL_KOORDINATORU' }, provinceId: 34 })).toEqual({
      authorUser: { AuthorProfile: { provinceId: 34 } }
    });
    expect(buildQuestionReadScope({ role: { code: 'IL_KOORDINATORU' } })).toEqual({ id: -1 });
  });

  it('EDITOR restricted to assigned branches and geography', () => {
    expect(buildQuestionReadScope({ role: { code: 'EDITOR' }, editorBranchId: 1, provinceId: 34 })).toEqual({
      authorUser: { AuthorProfile: { branchId: { in: [1] }, provinceId: 34 } }
    });
    expect(buildQuestionReadScope({ role: { code: 'EDITOR' }, branchAssignments: [{ branchId: 1 }, { branchId: 2 }], assignedRegion: 'Marmara', editorGrade: '8. Sınıf' })).toEqual({
      authorUser: { AuthorProfile: { branchId: { in: [1, 2] }, province: { region: 'Marmara' } } },
      grade: '8. Sınıf'
    });
    expect(buildQuestionReadScope({ role: { code: 'EDITOR' }, editorBranchId: 1 })).toEqual({ id: -1 });
  });

  it('YAZAR sees only own', () => {
    expect(buildQuestionReadScope({ role: { code: 'YAZAR' }, id: 5 })).toEqual({ authorUserId: 5 });
  });

  it('MUHASEBE denied', () => {
    expect(buildQuestionReadScope({ role: { code: 'MUHASEBE' } })).toEqual({ id: -1 });
  });
});

describe('Workflow Permissions', () => {
  it('EDITOR review constraints', () => {
    const editor = { role: { code: 'EDITOR' }, editorBranchId: 1, provinceId: 34 };
    expect(canWorkflowReview({ authorUser: { AuthorProfile: { branchId: 1, provinceId: 34 } } }, editor)).toBe(true);
    expect(canWorkflowReview({ authorUser: { AuthorProfile: { branchId: 2, provinceId: 34 } } }, editor)).toBe(false);
    expect(canWorkflowReview({ authorUser: { AuthorProfile: { branchId: 1, provinceId: 35 } } }, editor)).toBe(false);
    
    const strictEditor = { role: { code: 'EDITOR' }, editorBranchId: 1, provinceId: 34, editorGrade: '8. Sınıf' };
    expect(canWorkflowReview({ grade: '8. Sınıf', authorUser: { AuthorProfile: { branchId: 1, provinceId: 34 } } }, strictEditor)).toBe(true);
    expect(canWorkflowReview({ grade: '7. Sınıf', authorUser: { AuthorProfile: { branchId: 1, provinceId: 34 } } }, strictEditor)).toBe(false);
  });

  it('GENEL can always review', () => {
    expect(canWorkflowReview({}, { role: { code: 'GENEL_KOORDINATOR' } })).toBe(true);
  });
});
