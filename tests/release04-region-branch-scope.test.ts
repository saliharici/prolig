import { describe, expect, it } from 'vitest';
import { coordinatorBranchIds, buildUserReadScope, canAssignRole, canManageUserLifecycle } from '../api/v1/_lib/member-access.js';
import { buildAuthorReadScope } from '../api/v1/_lib/author-access.js';
import { buildProjectReadScope, canAssignProjectAuthor, canCreateProject, canManageProject } from '../api/v1/_lib/project-access.js';
import { buildTaskReadScope, canAssignTaskUser, canCreateTask, canManageTask, isTaskAssignee } from '../api/v1/_lib/task-access.js';
import { buildQuestionReadScope, canWorkflowReview } from '../api/v1/_lib/question-access.js';

const branchCoordinator = {
  id: 41, role: { code: 'BRANS_KOORDINATORU' },
  assignedRegion: 'Doğu Anadolu', branchAssignments: [{ branchId: 7 }, { branchId: 9 }]
};
const profile = (branchId: number, region: string) => ({
  branchId, province: { id: 25, region },
  status: 'Aktif', user: { status: 'Aktif', role: { code: 'YAZAR' } }
});
const project = (authors: ReturnType<typeof profile>[], branchId = 7) => ({
  id: 99, branch: { id: branchId },
  projectAuthors: authors.map(authorProfile => ({ authorProfile }))
});

describe('RELEASE-04 — branch coordinator regional scope (pure access policy)', () => {
  it('does not inherit the old editorBranchId when assignments are missing', () => {
    expect(coordinatorBranchIds({ editorBranchId: 7 })).toEqual([]);
    expect(coordinatorBranchIds(branchCoordinator)).toEqual([7, 9]);
    expect(buildAuthorReadScope({ ...branchCoordinator, branchAssignments: [] })).toEqual({ id: -1 });
    expect(buildQuestionReadScope({ ...branchCoordinator, assignedRegion: null })).toEqual({ id: -1 });
    expect(buildProjectReadScope({ ...branchCoordinator, assignedRegion: null })).toEqual({ id: -1 });
    expect(canCreateProject({ ...branchCoordinator, branchAssignments: [] })).toBe(false);
    expect(canCreateTask({ ...branchCoordinator, assignedRegion: null })).toBe(false);
  });

  it('limits user, author and question reads to region AND assigned branch', () => {
    expect(buildAuthorReadScope(branchCoordinator)).toEqual({
      branchId: { in: [7, 9] },
      province: { region: 'Doğu Anadolu' }
    });
    expect(buildUserReadScope(branchCoordinator)).toEqual({
      role: { code: 'YAZAR' },
      AuthorProfile: {
        branchId: { in: [7, 9] },
        province: { region: 'Doğu Anadolu' }
      }
    });
    const questions = buildQuestionReadScope(branchCoordinator);
    expect(questions.authorUser.AuthorProfile).toEqual({
      branchId: { in: [7, 9] }, province: { region: 'Doğu Anadolu' }
    });
    expect(questions.project).toEqual(buildProjectReadScope(branchCoordinator));
    expect(canWorkflowReview({}, branchCoordinator)).toBe(false);
  });

  it('refuses projects without authors or with mixed branch/region ownership', () => {
    expect(canCreateProject(branchCoordinator)).toBe(true);
    expect(canAssignProjectAuthor(branchCoordinator, profile(7, 'Doğu Anadolu'))).toBe(true);
    expect(canAssignProjectAuthor(branchCoordinator, profile(7, 'Marmara'))).toBe(false);
    expect(canAssignProjectAuthor(branchCoordinator, profile(5, 'Doğu Anadolu'))).toBe(false);

    const good = project([profile(7, 'Doğu Anadolu')]);
    const mixed = project([profile(7, 'Doğu Anadolu'), profile(7, 'Marmara')]);
    const wrongBranch = project([profile(7, 'Doğu Anadolu')], 6);
    expect(canManageProject(branchCoordinator, good)).toBe(true);
    expect(canManageProject(branchCoordinator, project([]))).toBe(false);
    expect(canManageProject(branchCoordinator, mixed)).toBe(false);
    expect(canManageProject(branchCoordinator, wrongBranch)).toBe(false);
    const scope = buildProjectReadScope(branchCoordinator);
    expect(scope).toEqual(expect.objectContaining({ branchId: { in: [7, 9] } }));
    expect(scope.projectAuthors).toHaveProperty('none');
    expect(scope.projectAuthors).toHaveProperty('some');
  });

  it('does not allow task-assignee status bypass outside scoped projects', () => {
    const goodTask = { project: project([profile(7, 'Doğu Anadolu')]), assignedCoordinatorId: 41 };
    const badTask = { project: project([profile(7, 'Marmara')]), assignedCoordinatorId: 41 };
    expect(buildTaskReadScope(branchCoordinator)).toEqual({ project: buildProjectReadScope(branchCoordinator) });
    expect(canManageTask(branchCoordinator, goodTask)).toBe(true);
    expect(canManageTask(branchCoordinator, badTask)).toBe(false);
    expect(isTaskAssignee(branchCoordinator, badTask)).toBe(false);
    expect(canAssignTaskUser(branchCoordinator, {
      id: 42, role: { code: 'BRANS_KOORDINATORU' }, status: 'Aktif', assignedRegion: 'Doğu Anadolu'
    })).toBe(false);
    expect(canAssignTaskUser(branchCoordinator, {
      id: 41, role: { code: 'BRANS_KOORDINATORU' }, status: 'Aktif', assignedRegion: 'Doğu Anadolu'
    })).toBe(true);
  });

  it('keeps regional role delegation below general scope and permits revocation', () => {
    const region = { role: { code: 'BOLGE_KOORDINATORU' }, assignedRegion: 'Doğu Anadolu' };
    expect(canAssignRole(region, 'BRANS_KOORDINATORU')).toBe(true);
    expect(canAssignRole(region, 'GENEL_KOORDINATOR')).toBe(false);
    expect(canManageUserLifecycle(region, branchCoordinator)).toBe(true);
    expect(canAssignRole(branchCoordinator, 'EDITOR')).toBe(false);
  });
});
