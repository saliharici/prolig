export const coordinatorRoles = new Set([
  'GENEL_KOORDINATOR',
  'BOLGE_KOORDINATORU',
  'IL_KOORDINATORU'
]);

export const regionAssignableRoles = new Set([
  'IL_KOORDINATORU',
  'EDITOR',
  'YAZAR'
]);

export function editorBranchIds(user: any): number[] {
  const ids = Array.isArray(user?.branchAssignments)
    ? user.branchAssignments.map((item: any) => item.branchId).filter((id: any) => Number.isSafeInteger(id) && id > 0)
    : [];
  if (ids.length === 0 && Number.isSafeInteger(user?.editorBranchId) && user.editorBranchId > 0) {
    ids.push(user.editorBranchId);
  }
  return [...new Set(ids)];
}

export function canViewProvince(user: any, province: any): boolean {
  const role = user?.role?.code;
  if (role === 'GENEL_KOORDINATOR') return true;
  if (!province) return false;
  if (role === 'BOLGE_KOORDINATORU') {
    return Boolean(user.assignedRegion) && province.region === user.assignedRegion;
  }
  if (role === 'IL_KOORDINATORU') {
    return Number.isSafeInteger(user.provinceId) && province.id === user.provinceId;
  }
  return false;
}

export function buildApplicationReadScope(user: any) {
  const role = user?.role?.code;
  if (role === 'GENEL_KOORDINATOR') return {};
  if (role === 'BOLGE_KOORDINATORU') {
    if (!user.assignedRegion) return { id: -1 };
    return { province: { region: user.assignedRegion } };
  }
  if (role === 'IL_KOORDINATORU') {
    if (!user.provinceId) return { id: -1 };
    return { provinceId: user.provinceId };
  }
  return null;
}

export function buildUserReadScope(user: any) {
  const role = user?.role?.code;
  if (role === 'GENEL_KOORDINATOR') return {};
  if (role === 'BOLGE_KOORDINATORU') {
    if (!user.assignedRegion) return { id: -1 };
    return {
      OR: [
        { assignedRegion: user.assignedRegion },
        { province: { region: user.assignedRegion } },
        { AuthorProfile: { province: { region: user.assignedRegion } } }
      ]
    };
  }
  if (role === 'IL_KOORDINATORU') {
    if (!user.provinceId) return { id: -1 };
    return {
      OR: [
        { provinceId: user.provinceId },
        { AuthorProfile: { provinceId: user.provinceId } }
      ]
    };
  }
  return null;
}

export function canAssignRole(actor: any, roleCode: string): boolean {
  const actorRole = actor?.role?.code;
  if (actorRole === 'GENEL_KOORDINATOR') {
    return ['GENEL_KOORDINATOR','BOLGE_KOORDINATORU','IL_KOORDINATORU','EDITOR','YAZAR','MUHASEBE'].includes(roleCode);
  }
  if (actorRole === 'BOLGE_KOORDINATORU') {
    return regionAssignableRoles.has(roleCode);
  }
  return false;
}
