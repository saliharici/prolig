/**
 * RELEASE-04: Deny-by-default per-user capabilities. These grants NEVER widen
 * geography: all requests are additionally constrained to assignedRegion
 * intersected with UserBranchAssignment.
 *
 * No finance, editorial approval, book publishing, user administration,
 * messages, announcements, or role escalation capability can be delegated.
 */
export const BRANCH_PERMISSION_KEYS = [
  'authors.read',
  'projects.read',
  'projects.create',
  'projects.update',
  'tasks.read',
  'tasks.create',
  'tasks.update',
  'questions.read'
] as const;

export type BranchPermission = typeof BRANCH_PERMISSION_KEYS[number];
const keys = new Set<string>(BRANCH_PERMISSION_KEYS);

export function isBranchCoordinatorActivationEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.RELEASE04_BRANS_ACTIVATION_ENABLED === 'true';
}

export function validBranchPermissionSelection(raw: unknown): raw is BranchPermission[] {
  return Array.isArray(raw) &&
    raw.length <= BRANCH_PERMISSION_KEYS.length &&
    raw.every((item): item is BranchPermission => typeof item === 'string' && keys.has(item)) &&
    new Set(raw).size === raw.length;
}

export function hasBranchPermission(user: any, key: BranchPermission): boolean {
  if (user?.role?.code !== 'BRANS_KOORDINATORU') return false;
  if (!isBranchCoordinatorActivationEnabled()) return false;
  if (!user?.assignedRegion || !Array.isArray(user?.branchAssignments) ||
    !user.branchAssignments.some((a: any) => Number.isSafeInteger(a?.branchId) && a.branchId > 0)) return false;
  return Array.isArray(user.branchPermissions) && user.branchPermissions.includes(key);
}

/** Dependencies prevent grants that are not usable safely. */
export function validateBranchPermissionDependencies(raw: unknown): boolean {
  if (!validBranchPermissionSelection(raw)) return false;
  const grants = new Set(raw);
  if (grants.has('projects.create') && (!grants.has('projects.read') || !grants.has('authors.read'))) return false;
  if (grants.has('projects.update') && !grants.has('projects.read')) return false;
  if (grants.has('tasks.read') && !grants.has('projects.read')) return false;
  // Underlying project/task handlers require a manageable project for writes.
  // Enforce those requirements at grant time, rather than issuing unusable grants.
  if (grants.has('tasks.create') && (!grants.has('tasks.read') || !grants.has('tasks.update') ||
      !grants.has('projects.read') || !grants.has('projects.update'))) return false;
  if (grants.has('tasks.update') && (!grants.has('tasks.read') || !grants.has('projects.update'))) return false;
  if (grants.has('questions.read') && !grants.has('projects.read')) return false;
  return true;
}

export const BRANCH_PERMISSION_LABELS: Record<BranchPermission, string> = {
  'authors.read': 'Yazarları görüntüle',
  'projects.read': 'Projeleri görüntüle',
  'projects.create': 'Proje oluştur',
  'projects.update': 'Projeleri düzenle',
  'tasks.read': 'Görevleri görüntüle',
  'tasks.create': 'Görev oluştur',
  'tasks.update': 'Görevleri düzenle',
  'questions.read': 'Soruları görüntüle'
};
