const supportedProjectReadRoles = new Set([
  'GENEL_KOORDINATOR',
  'BOLGE_KOORDINATORU',
  'IL_KOORDINATORU',
  'EDITOR',
  'YAZAR',
  'MUHASEBE'
]);

export function buildProjectReadScope(user: any) {
  const roleCode = user.role?.code;

  if (!supportedProjectReadRoles.has(roleCode)) return null;

  if (roleCode === 'GENEL_KOORDINATOR' || roleCode === 'MUHASEBE') {
    return {};
  }

  if (roleCode === 'BOLGE_KOORDINATORU') {
    if (!user.assignedRegion) return { id: -1 };
    return {
      projectAuthors: {
        some: {
          authorProfile: {
            province: { region: user.assignedRegion }
          }
        }
      }
    };
  }

  if (roleCode === 'IL_KOORDINATORU') {
    if (!user.provinceId) return { id: -1 };
    return {
      projectAuthors: {
        some: {
          authorProfile: { provinceId: user.provinceId }
        }
      }
    };
  }

  if (roleCode === 'EDITOR') {
    if (!user.editorBranchId) return { id: -1 };
    return {
      branchId: user.editorBranchId,
      ...(user.editorGrade ? { targetGrade: user.editorGrade } : {})
    };
  }

  if (!user.AuthorProfile?.id) return { id: -1 };
  return {
    projectAuthors: {
      some: { authorProfileId: user.AuthorProfile.id }
    }
  };
}
