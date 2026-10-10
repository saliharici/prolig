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
    const profileScope: any = { branchId: { in: branchIds } };
    if (user.provinceId) {
      profileScope.provinceId = user.provinceId;
    } else if (user.assignedRegion) {
      profileScope.province = { region: user.assignedRegion };
    } else {
      return { id: -1 };
    }
    const scope: any = { authorUser: { AuthorProfile: profileScope } };
    if (user.editorGrade) scope.grade = user.editorGrade;
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
    const profile = question.authorUser?.AuthorProfile;
    if (!branchIds.includes(profile?.branchId)) return false;
    if (user.provinceId) {
      if (profile?.provinceId !== user.provinceId) return false;
    } else if (user.assignedRegion) {
      if (profile?.province?.region !== user.assignedRegion) return false;
    } else {
      return false;
    }
    if (user.editorGrade && question.grade !== user.editorGrade) return false;
    return true;
  }
  return false;
}


export function canArchiveQuestion(question: any, user: any): boolean {
  const role = user?.role?.code;
  if (role === 'GENEL_KOORDINATOR') return true;
  if (role === 'BOLGE_KOORDINATORU' || role === 'IL_KOORDINATORU') {
    return question.status !== 'INCELEMEDE';
  }
  if (role === 'EDITOR') {
    return ['ONAYLANDI', 'REDDEDILDI'].includes(question.status);
  }
  if (role === 'YAZAR') {
    return question.authorUserId === user.id && ['TASLAK', 'REVIZYON', 'REDDEDILDI'].includes(question.status);
  }
  return false;
}

export function canRestoreQuestion(question: any, user: any): boolean {
  const role = user?.role?.code;
  if (role === 'GENEL_KOORDINATOR') return true;
  if (role === 'BOLGE_KOORDINATORU' || role === 'IL_KOORDINATORU') return true;
  if (role === 'EDITOR') return ['ONAYLANDI', 'REDDEDILDI'].includes(question.status);
  if (role === 'YAZAR') {
    return question.authorUserId === user.id && ['TASLAK', 'REVIZYON', 'REDDEDILDI'].includes(question.status);
  }
  return false;
}

export function canDeleteQuestion(question: any, user: any, isArchived: boolean): boolean {
  const role = user?.role?.code;
  if (role === 'GENEL_KOORDINATOR') return true;
  if (role === 'BOLGE_KOORDINATORU' || role === 'IL_KOORDINATORU') {
    return isArchived && ['TASLAK', 'REVIZYON', 'REDDEDILDI'].includes(question.status);
  }
  if (role === 'EDITOR') {
    return isArchived && question.status === 'REDDEDILDI';
  }
  if (role === 'YAZAR') {
    return question.authorUserId === user.id && ['TASLAK', 'REVIZYON', 'REDDEDILDI'].includes(question.status);
  }
  return false;
}
