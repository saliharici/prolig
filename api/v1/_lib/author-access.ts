import { editorBranchIds } from './member-access.js';

const supportedAuthorReadRoles = new Set([
  'GENEL_KOORDINATOR',
  'BOLGE_KOORDINATORU',
  'IL_KOORDINATORU',
  'EDITOR',
  'YAZAR',
  'MUHASEBE'
]);

export function buildAuthorReadScope(user: any) {
  const roleCode = user.role?.code;
  if (!supportedAuthorReadRoles.has(roleCode)) return null;

  if (roleCode === 'GENEL_KOORDINATOR' || roleCode === 'MUHASEBE') return {};

  if (roleCode === 'BOLGE_KOORDINATORU') {
    if (!user.assignedRegion) return { id: -1 };
    return { province: { region: user.assignedRegion } };
  }

  if (roleCode === 'IL_KOORDINATORU') {
    if (!user.provinceId) return { id: -1 };
    return { provinceId: user.provinceId };
  }

  if (roleCode === 'EDITOR') {
    const branchIds = editorBranchIds(user);
    if (branchIds.length === 0) return { id: -1 };
    if (user.provinceId) return { branchId: { in: branchIds }, provinceId: user.provinceId };
    if (user.assignedRegion) return { branchId: { in: branchIds }, province: { region: user.assignedRegion } };
    return { id: -1 };
  }

  if (!user.AuthorProfile?.id) return { id: -1 };
  return { id: user.AuthorProfile.id };
}
