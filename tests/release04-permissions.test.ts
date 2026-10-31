import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BRANCH_PERMISSION_KEYS,
  hasBranchPermission,
  isBranchCoordinatorActivationEnabled,
  validateBranchPermissionDependencies,
  validBranchPermissionSelection
} from '../api/v1/_lib/branch-permissions.js';
import { buildAuthorReadScope } from '../api/v1/_lib/author-access.js';
import { buildProjectReadScope, canCreateProject } from '../api/v1/_lib/project-access.js';
import { buildTaskReadScope, canCreateTask } from '../api/v1/_lib/task-access.js';
import { buildQuestionReadScope, canWorkflowReview } from '../api/v1/_lib/question-access.js';

const target = {
  role: { code: 'BRANS_KOORDINATORU' }, assignedRegion: 'Doğu Anadolu',
  branchAssignments: [{ branchId: 7 }], branchPermissions: [...BRANCH_PERMISSION_KEYS]
};
afterEach(() => vi.unstubAllEnvs());

describe('RELEASE-04 per-user capability and activation boundary', () => {
  it('defaults activation OFF and never accepts approximate flag values', () => {
    vi.stubEnv('RELEASE04_BRANS_ACTIVATION_ENABLED', '');
    expect(isBranchCoordinatorActivationEnabled()).toBe(false);
    expect(hasBranchPermission(target, 'authors.read')).toBe(false);
    expect(buildAuthorReadScope(target)).toEqual({ id: -1 });
    expect(canCreateProject(target)).toBe(false);
    vi.stubEnv('RELEASE04_BRANS_ACTIVATION_ENABLED', 'TRUE');
    expect(isBranchCoordinatorActivationEnabled()).toBe(false);
  });

  it('grants exactly enumerated rights; no role escalation or finance permissions', () => {
    vi.stubEnv('RELEASE04_BRANS_ACTIVATION_ENABLED', 'true');
    expect(validBranchPermissionSelection(['authors.read','projects.read'])).toBe(true);
    expect(validBranchPermissionSelection(['authors.read','authors.read'])).toBe(false);
    expect(validBranchPermissionSelection(['finance.read'])).toBe(false);
    expect(validBranchPermissionSelection(['roles.manage'])).toBe(false);
    expect(validBranchPermissionSelection(['questions.approve'])).toBe(false);
    expect(validBranchPermissionSelection('authors.read')).toBe(false);
    expect(validateBranchPermissionDependencies(['projects.create'])).toBe(false);
    expect(validateBranchPermissionDependencies(['projects.create','authors.read','projects.read'])).toBe(true);
    expect(validateBranchPermissionDependencies(['tasks.create','tasks.read','projects.read'])).toBe(false);
    expect(validateBranchPermissionDependencies([...BRANCH_PERMISSION_KEYS])).toBe(true);
    expect(canWorkflowReview({}, target)).toBe(false);
  });

  it('keeps regional/branch constraints even if per-user permission exists', () => {
    vi.stubEnv('RELEASE04_BRANS_ACTIVATION_ENABLED', 'true');
    expect(hasBranchPermission(target, 'authors.read')).toBe(true);
    expect(hasBranchPermission({ ...target, assignedRegion: null }, 'authors.read')).toBe(false);
    expect(hasBranchPermission({ ...target, branchAssignments: [] }, 'authors.read')).toBe(false);
    expect(hasBranchPermission({ ...target, role: {code: 'EDITOR'} }, 'authors.read')).toBe(false);
  });

  it('restricts every read/write independently and fails closed on missing grants', () => {
    vi.stubEnv('RELEASE04_BRANS_ACTIVATION_ENABLED', 'true');
    const readOnly = { ...target, branchPermissions: ['projects.read'] };
    expect(buildProjectReadScope(readOnly)).toHaveProperty('branchId');
    expect(canCreateProject(readOnly)).toBe(false);
    expect(buildAuthorReadScope(readOnly)).toEqual({ id: -1 });
    expect(buildQuestionReadScope(readOnly)).toEqual({ id: -1 });
    expect(buildTaskReadScope(readOnly)).toEqual({ id: -1 });
    expect(canCreateTask(readOnly)).toBe(false);
    expect(buildProjectReadScope({ ...target, branchPermissions: [] })).toEqual({ id: -1 });
    expect(buildQuestionReadScope({ ...target, branchPermissions: [] })).toEqual({ id: -1 });
  });
});
