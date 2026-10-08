import { editorBranchIds } from './member-access.js';

export function buildQuestionReadScope(user: any) {
  const roleCode = user.role.code;

  if (roleCode === 'GENEL_KOORDINATOR') {
    return {};
  }

  if (roleCode === 'BOLGE_KOORDINATORU') {
    if (!user.assignedRegion) return { id: -1 }; // Fail closed
    return {
      authorUser: {
        AuthorProfile: {
          province: {
            region: user.assignedRegion
          }
        }
      }
    };
  }

  if (roleCode === 'IL_KOORDINATORU') {
    if (!user.provinceId) return { id: -1 }; // Fail closed
    return {
      authorUser: {
        AuthorProfile: {
          provinceId: user.provinceId
        }
      }
    };
  }

  if (roleCode === 'EDITOR') {
    const branchIds = editorBranchIds(user);
    if (branchIds.length === 0) return { id: -1 }; // Fail closed
    const scope: any = {
      authorUser: {
        AuthorProfile: {
          branchId: { in: branchIds }
        }
      }
    };
    if (user.editorGrade) {
      scope.grade = user.editorGrade;
    }
    return scope;
  }

  if (roleCode === 'YAZAR') {
    return {
      authorUserId: user.id
    };
  }

  // MUHASEBE or unknown
  return { id: -1 }; // Fail closed
}

export function canWorkflowReview(question: any, user: any) {
  if (user.role.code === 'GENEL_KOORDINATOR') return true;
  if (user.role.code === 'EDITOR') {
    const branchIds = editorBranchIds(user);
    if (branchIds.length === 0) return false;
    if (!branchIds.includes(question.authorUser?.AuthorProfile?.branchId)) return false;
    if (user.editorGrade && question.grade !== user.editorGrade) return false;
    return true;
  }
  return false;
}
