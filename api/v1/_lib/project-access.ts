import { editorBranchIds } from './member-access.js';

export const projectManagerRoles = new Set([
  'GENEL_KOORDINATOR',
  'BOLGE_KOORDINATORU',
  'IL_KOORDINATORU'
]);

const supportedProjectReadRoles = new Set([
  'GENEL_KOORDINATOR',
  'BOLGE_KOORDINATORU',
  'IL_KOORDINATORU',
  'EDITOR',
  'YAZAR',
  'MUHASEBE'
]);

export function canCreateProject(user: any): boolean {
  return projectManagerRoles.has(user?.role?.code);
}

function authorProvinceInActorScope(actor: any, province: any): boolean {
  const roleCode = actor?.role?.code;
  if (!province) return false;
  if (roleCode === 'GENEL_KOORDINATOR') return true;
  if (roleCode === 'BOLGE_KOORDINATORU') {
    return Boolean(actor.assignedRegion) && province.region === actor.assignedRegion;
  }
  if (roleCode === 'IL_KOORDINATORU') {
    return Number.isSafeInteger(actor.provinceId) && province.id === actor.provinceId;
  }
  return false;
}

export function canAssignProjectAuthor(actor: any, authorProfile: any): boolean {
  if (!projectManagerRoles.has(actor?.role?.code)) return false;
  if (!authorProfile || authorProfile.status !== 'Aktif') return false;
  if (authorProfile.user?.status?.toUpperCase?.() !== 'AKTIF') return false;
  if (authorProfile.user?.role?.code !== 'YAZAR') return false;
  return authorProvinceInActorScope(actor, authorProfile.province);
}

export function canManageProject(actor: any, project: any): boolean {
  const roleCode = actor?.role?.code;
  if (!projectManagerRoles.has(roleCode)) return false;
  if (roleCode === 'GENEL_KOORDINATOR') return true;

  const assignments = Array.isArray(project?.projectAuthors) ? project.projectAuthors : [];
  const profiles = assignments.map((item: any) => item?.authorProfile).filter(Boolean);
  const allAuthorsInScope = profiles.every((profile: any) => authorProvinceInActorScope(actor, profile.province));

  if (!allAuthorsInScope) return false;
  if (project?.coordinatorId === actor?.id) return true;

  return profiles.length > 0;
}

export function buildProjectReadScope(user: any) {
  const roleCode = user.role?.code;

  if (!supportedProjectReadRoles.has(roleCode)) return null;

  if (roleCode === 'GENEL_KOORDINATOR' || roleCode === 'MUHASEBE') {
    return {};
  }

  if (roleCode === 'BOLGE_KOORDINATORU') {
    if (!user.assignedRegion) return { id: -1 };
    return {
      OR: [
        { coordinatorId: user.id },
        {
          projectAuthors: {
            some: {
              authorProfile: {
                province: { region: user.assignedRegion }
              }
            }
          }
        }
      ]
    };
  }

  if (roleCode === 'IL_KOORDINATORU') {
    if (!user.provinceId) return { id: -1 };
    return {
      OR: [
        { coordinatorId: user.id },
        {
          projectAuthors: {
            some: {
              authorProfile: { provinceId: user.provinceId }
            }
          }
        }
      ]
    };
  }

  if (roleCode === 'EDITOR') {
    const branchIds = editorBranchIds(user);
    if (branchIds.length === 0) return { id: -1 };
    const geography = user.provinceId
      ? { projectAuthors: { some: { authorProfile: { provinceId: user.provinceId } } } }
      : user.assignedRegion
        ? { projectAuthors: { some: { authorProfile: { province: { region: user.assignedRegion } } } } }
        : { id: -1 };
    if ('id' in geography) return geography;
    return {
      branchId: { in: branchIds },
      ...geography,
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
