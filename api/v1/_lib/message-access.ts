import { assignedBranchIds, editorBranchIds } from './member-access.js';

function provinceOf(user: any) {
  return user?.province ?? user?.AuthorProfile?.province ?? user?.messageProvince ?? null;
}

function targetEditorBranchIds(user: any): number[] {
  const ids: number[] = [];
  if (Array.isArray(user?.branchAssignments)) {
    for (const item of user.branchAssignments) {
      if (Number.isSafeInteger(item?.branchId) && item.branchId > 0) ids.push(item.branchId);
    }
  }
  if (ids.length === 0 && Number.isSafeInteger(user?.editorBranchId) && user.editorBranchId > 0) {
    ids.push(user.editorBranchId);
  }
  return [...new Set(ids)];
}

function sameEditorGeography(editor: any, province: any) {
  if (!province) return false;
  if (editor.provinceId) return editor.provinceId === province.id;
  if (editor.assignedRegion) return editor.assignedRegion === province.region;
  return false;
}

export function canMessageRecipient(actor: any, target: any): boolean {
  if (!actor || !target || actor.id === target.id) return false;
  if (target.status?.toUpperCase?.() !== 'AKTIF') return false;

  const actorRole = actor.role?.code;
  const targetRole = target.role?.code;
  const actorProvince = provinceOf(actor);
  const targetProvince = provinceOf(target);

  if (actorRole === 'GENEL_KOORDINATOR') return true;

  if (actorRole === 'BOLGE_KOORDINATORU') {
    if (targetRole === 'GENEL_KOORDINATOR') return true;
    if (!actor.assignedRegion) return false;
    if (target.assignedRegion) return target.assignedRegion === actor.assignedRegion;
    return targetProvince?.region === actor.assignedRegion;
  }

  if (actorRole === 'BRANS_KOORDINATORU') {
    if (targetRole === 'GENEL_KOORDINATOR') return true;
    const ids = assignedBranchIds(actor);
    if (!ids.length) return false;
    if (targetRole === 'YAZAR') return ids.includes(target.AuthorProfile?.branchId);
    if (targetRole === 'EDITOR') return targetEditorBranchIds(target).some(id => ids.includes(id));
    return false;
  }

  if (actorRole === 'EDITOR') {
    if (targetRole === 'GENEL_KOORDINATOR') return true;
    if (targetRole === 'BOLGE_KOORDINATORU') {
      return Boolean(actorProvince?.region) && target.assignedRegion === actorProvince.region;
    }
    if (targetRole === 'BRANS_KOORDINATORU') {
      return editorBranchIds(actor).some(id => targetEditorBranchIds(target).includes(id));
    }
    if (targetRole !== 'YAZAR' || !target.AuthorProfile) return false;
    if (!sameEditorGeography(actor, targetProvince)) return false;
    return editorBranchIds(actor).includes(target.AuthorProfile.branchId);
  }

  if (actorRole === 'YAZAR') {
    if (targetRole === 'GENEL_KOORDINATOR') return true;
    if (!actorProvince || !actor.AuthorProfile) return false;
    if (targetRole === 'BOLGE_KOORDINATORU') {
      return target.assignedRegion === actorProvince.region;
    }
    if (targetRole === 'BRANS_KOORDINATORU') {
      return targetEditorBranchIds(target).includes(actor.AuthorProfile.branchId);
    }
    if (targetRole !== 'EDITOR') return false;
    return sameEditorGeography(target, actorProvince)
      && targetEditorBranchIds(target).includes(actor.AuthorProfile.branchId);
  }

  if (actorRole === 'MUHASEBE') {
    if (['GENEL_KOORDINATOR','BOLGE_KOORDINATORU','BRANS_KOORDINATORU'].includes(targetRole)) return true;
    return targetRole === 'YAZAR' && (target._count?.Payment ?? 0) > 0;
  }

  return false;
}

export function canUseMessages(user: any): boolean {
  return ['GENEL_KOORDINATOR','BOLGE_KOORDINATORU','BRANS_KOORDINATORU','EDITOR','YAZAR','MUHASEBE'].includes(user?.role?.code);
}
