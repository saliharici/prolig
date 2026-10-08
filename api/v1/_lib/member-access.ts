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
  const ids: number[] = [];
  if (Array.isArray(user?.branchAssignments)) {
    for (const item of user.branchAssignments) {
      const branchId = item?.branchId;
      if (typeof branchId === 'number' && Number.isSafeInteger(branchId) && branchId > 0) ids.push(branchId);
    }
  }
  if (ids.length === 0 && typeof user?.editorBranchId === 'number' && Number.isSafeInteger(user.editorBranchId) && user.editorBranchId > 0) {
    ids.push(user.editorBranchId);
  }
  return Array.from(new Set<number>(ids));
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

export function buildApplicationReadScope(user: any): any {
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

export function buildUserReadScope(user: any): any {
  const role = user?.role?.code;
  if (role === 'GENEL_KOORDINATOR') return {};
  if (role === 'BOLGE_KOORDINATORU') {
    if (!user.assignedRegion) return { id: -1 };
    return {
      OR: [
        { assignedRegion: user.assignedRegion },
        { province: { region: user.assignedRegion } },
        { AND: [{ role: { code: 'YAZAR' } }, { AuthorProfile: { province: { region: user.assignedRegion } } }] }
      ]
    };
  }
  if (role === 'IL_KOORDINATORU') {
    if (!user.provinceId) return { id: -1 };
    return {
      OR: [
        { provinceId: user.provinceId },
        { AND: [{ role: { code: 'YAZAR' } }, { AuthorProfile: { provinceId: user.provinceId } }] }
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
