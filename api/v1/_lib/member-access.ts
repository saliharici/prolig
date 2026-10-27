export const coordinatorRoles = new Set([
  'GENEL_KOORDINATOR',
  'BOLGE_KOORDINATORU',
  'BRANS_KOORDINATORU'
]);

export const regionAssignableRoles = new Set([
  'EDITOR',
  'YAZAR'
]);

export function assignedBranchIds(user: any): number[] {
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

export const editorBranchIds = assignedBranchIds;

export function canViewProvince(user: any, province: any): boolean {
  const role = user?.role?.code;
  if (role === 'GENEL_KOORDINATOR') return true;
  if (!province) return false;
  if (role === 'BOLGE_KOORDINATORU') {
    return Boolean(user.assignedRegion) && province.region === user.assignedRegion;
  }
  // Branş koordinatörü coğrafi yönetici değildir; il bazlı üyelik onayı yapamaz.
  return false;
}

export function buildApplicationReadScope(user: any): any {
  const role = user?.role?.code;
  if (role === 'GENEL_KOORDINATOR') return {};
  if (role === 'BOLGE_KOORDINATORU') {
    if (!user.assignedRegion) return { id: -1 };
    return { province: { region: user.assignedRegion } };
  }
  // Branş koordinatörünün üyelik başvuru yetkisi yoktur.
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
  if (role === 'BRANS_KOORDINATORU') {
    const ids = assignedBranchIds(user);
    if (!ids.length) return { id: -1 };
    return { role: { code: 'YAZAR' }, AuthorProfile: { branchId: { in: ids } } };
  }
  return null;
}

export function canAssignRole(actor: any, roleCode: string): boolean {
  const actorRole = actor?.role?.code;
  if (actorRole === 'GENEL_KOORDINATOR') {
    return ['GENEL_KOORDINATOR','BOLGE_KOORDINATORU','BRANS_KOORDINATORU','EDITOR','YAZAR','MUHASEBE'].includes(roleCode);
  }
  if (actorRole === 'BOLGE_KOORDINATORU') {
    return regionAssignableRoles.has(roleCode);
  }
  // Branş koordinatörünün yetkisi mevcut yazar/proje atamalarıyladır;
  // kullanıcı açma ve rol değiştirme yalnız genel/bölge yönetimindedir.
  return false;
}


export function canManageUserLifecycle(actor: any, target: any): boolean {
  const actorRole = actor?.role?.code;
  const targetRole = target?.role?.code;
  if (!actorRole || !targetRole) return false;

  // Peer General Coordinators cannot deactivate/delete one another.
  if (actorRole === 'GENEL_KOORDINATOR') {
    return targetRole !== 'GENEL_KOORDINATOR';
  }

  if (actorRole === 'BOLGE_KOORDINATORU') {
    return ['EDITOR', 'YAZAR'].includes(targetRole);
  }

  // Branş koordinatörü kullanıcı aktivasyonu veya silme işlemi yapamaz.

  return false;
}
