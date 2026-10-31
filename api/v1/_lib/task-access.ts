import { buildProjectReadScope, canManageProject } from './project-access.js';

export const taskManagerRoles = new Set([
  'GENEL_KOORDINATOR',
  'BOLGE_KOORDINATORU',
  'IL_KOORDINATORU',
  'BRANS_KOORDINATORU'
]);

export function canCreateTask(user: any): boolean {
  return taskManagerRoles.has(user?.role?.code);
}

export function buildTaskReadScope(user: any) {
  const role = user?.role?.code;

  if (role === 'GENEL_KOORDINATOR') return {};

  if (role === 'BOLGE_KOORDINATORU' || role === 'IL_KOORDINATORU') {
    const projectScope = buildProjectReadScope(user);
    if (!projectScope) return { id: -1 };
    return {
      OR: [
        { assignedCoordinatorId: user.id },
        { project: projectScope }
      ]
    };
  }

  if (role === 'BRANS_KOORDINATORU') {
    const projectScope = buildProjectReadScope(user);
    if (!projectScope || 'id' in projectScope) return { id: -1 };
    return { project: projectScope };
  }

  if (role === 'EDITOR') {
    return { assignedCoordinatorId: user.id };
  }

  if (role === 'YAZAR') {
    if (!user.AuthorProfile?.id) return { id: -1 };
    return { assignedAuthorProfileId: user.AuthorProfile.id };
  }

  return null;
}

export function isTaskAssignee(user: any, task: any): boolean {
  if (!user || !task) return false;
  if (user.role?.code === 'BRANS_KOORDINATORU' && !canManageTask(user, task)) return false;
  if (task.assignedCoordinatorId === user.id) return true;
  return Boolean(user.AuthorProfile?.id) && task.assignedAuthorProfileId === user.AuthorProfile.id;
}

export function canManageTask(user: any, task: any): boolean {
  if (!taskManagerRoles.has(user?.role?.code)) return false;
  return canManageProject(user, task?.project);
}

export function canUpdateTaskStatus(user: any, task: any): boolean {
  if (user?.role?.code === 'BRANS_KOORDINATORU') return canManageTask(user, task);
  return canManageTask(user, task) || isTaskAssignee(user, task);
}

export function canAssignTaskUser(actor: any, target: any): boolean {
  if (!taskManagerRoles.has(actor?.role?.code) || !target) return false;
  if (target.status?.toUpperCase?.() !== 'AKTIF') return false;
  if (!['GENEL_KOORDINATOR', 'BOLGE_KOORDINATORU', 'IL_KOORDINATORU', 'BRANS_KOORDINATORU', 'EDITOR'].includes(target.role?.code)) {
    return false;
  }

  if (actor.role.code === 'GENEL_KOORDINATOR') return true;
  if (target.id === actor.id) return true;

  if (actor.role.code === 'BOLGE_KOORDINATORU') {
    if (!actor.assignedRegion) return false;
    if (target.role.code === 'BOLGE_KOORDINATORU') return target.assignedRegion === actor.assignedRegion;
    if (target.assignedRegion) return target.assignedRegion === actor.assignedRegion;
    return target.province?.region === actor.assignedRegion;
  }

  if (actor.role.code === 'BRANS_KOORDINATORU') {
    // Only self-assignment; do not delegate tasks to another region/branch.
    return Boolean(actor.assignedRegion) && target.id === actor.id &&
      target.assignedRegion === actor.assignedRegion;
  }

  if (actor.role.code === 'IL_KOORDINATORU') {
    if (!actor.provinceId) return false;
    return target.role.code === 'EDITOR' && target.provinceId === actor.provinceId;
  }

  return false;
}

export function canAdvanceOwnTask(currentStatus: string, nextStatus: string): boolean {
  if (currentStatus === 'Bekliyor') return nextStatus === 'Devam_Ediyor';
  if (currentStatus === 'Devam_Ediyor' || currentStatus === 'Gecikti') {
    return nextStatus === 'Kontrol_Bekliyor';
  }
  return false;
}
