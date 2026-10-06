export function buildQuestionReadScope(user: any) {
  const roleCode = user.role.code;

  if (roleCode === 'GENEL_KOORDINATOR') {
    return {};
  }

  if (roleCode === 'BOLGE_KOORDINATORU') {
    if (!user.assignedRegion) return { id: -1 }; // Fail closed
    return {
      authorUser: {
        province: {
          region: user.assignedRegion
        }
      }
    };
  }

  if (roleCode === 'IL_KOORDINATORU') {
    if (!user.provinceId) return { id: -1 }; // Fail closed
    return {
      authorUser: {
        provinceId: user.provinceId
      }
    };
  }

  if (roleCode === 'EDITOR') {
    if (!user.editorBranchId) return { id: -1 }; // Fail closed
    const scope: any = {
      authorUser: {
        AuthorProfile: {
          branchId: user.editorBranchId
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

export function canWorkflowSubmit(question: any, user: any) {
  if (user.role.code !== 'YAZAR') return false;
  return question.authorUserId === user.id && (question.status === 'TASLAK' || question.status === 'REVIZYON');
}

export function canWorkflowReview(question: any, user: any) {
  if (user.role.code === 'GENEL_KOORDINATOR') return true;
  if (user.role.code === 'EDITOR') {
    if (!user.editorBranchId) return false;
    if (question.authorUser?.AuthorProfile?.branchId !== user.editorBranchId) return false;
    if (user.editorGrade && question.grade !== user.editorGrade) return false;
    return true;
  }
  return false;
}
