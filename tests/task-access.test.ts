import { describe, expect, it } from 'vitest';
import {
  buildTaskReadScope,
  canAdvanceOwnTask,
  canAssignTaskUser,
  canCreateTask,
  canManageTask,
  isTaskAssignee
} from '../api/v1/_lib/task-access.js';

describe('task access hierarchy', () => {
  it('limits task creation to coordinators', () => {
    expect(canCreateTask({ role: { code: 'GENEL_KOORDINATOR' } })).toBe(true);
    expect(canCreateTask({ role: { code: 'BOLGE_KOORDINATORU' } })).toBe(true);
    expect(canCreateTask({ role: { code: 'IL_KOORDINATORU' } })).toBe(true);
    expect(canCreateTask({ role: { code: 'EDITOR' } })).toBe(false);
    expect(canCreateTask({ role: { code: 'YAZAR' } })).toBe(false);
  });

  it('scopes authors and editors to assigned tasks', () => {
    expect(buildTaskReadScope({ id: 8, role: { code: 'EDITOR' } })).toEqual({ assignedCoordinatorId: 8 });
    expect(buildTaskReadScope({ id: 9, role: { code: 'YAZAR' }, AuthorProfile: { id: 44 } })).toEqual({ assignedAuthorProfileId: 44 });
    expect(buildTaskReadScope({ id: 9, role: { code: 'YAZAR' }, AuthorProfile: null })).toEqual({ id: -1 });
    expect(buildTaskReadScope({ role: { code: 'MUHASEBE' } })).toBeNull();
  });

  it('recognizes either user or author-profile assignment', () => {
    expect(isTaskAssignee({ id: 5, AuthorProfile: null }, { assignedCoordinatorId: 5 })).toBe(true);
    expect(isTaskAssignee({ id: 7, AuthorProfile: { id: 12 } }, { assignedAuthorProfileId: 12 })).toBe(true);
  });

  it('lets an assignee advance but not self-complete workflow', () => {
    expect(canAdvanceOwnTask('Bekliyor', 'Devam_Ediyor')).toBe(true);
    expect(canAdvanceOwnTask('Devam_Ediyor', 'Kontrol_Bekliyor')).toBe(true);
    expect(canAdvanceOwnTask('Gecikti', 'Kontrol_Bekliyor')).toBe(true);
    expect(canAdvanceOwnTask('Kontrol_Bekliyor', 'Tamamlandi')).toBe(false);
  });

  it('keeps coordinator/editor assignment inside hierarchy', () => {
    const editor = { id: 20, status: 'Aktif', role: { code: 'EDITOR' }, provinceId: 25, province: { id: 25, region: 'Doğu Anadolu' } };
    expect(canAssignTaskUser({ id: 1, role: { code: 'GENEL_KOORDINATOR' } }, editor)).toBe(true);
    expect(canAssignTaskUser({ id: 2, role: { code: 'BOLGE_KOORDINATORU' }, assignedRegion: 'Doğu Anadolu' }, editor)).toBe(true);
    expect(canAssignTaskUser({ id: 3, role: { code: 'IL_KOORDINATORU' }, provinceId: 25 }, editor)).toBe(true);
    expect(canAssignTaskUser({ id: 3, role: { code: 'IL_KOORDINATORU' }, provinceId: 34 }, editor)).toBe(false);
  });

  it('uses project management scope for task managers', () => {
    const project = {
      coordinatorId: 3,
      projectAuthors: []
    };
    expect(canManageTask({ id: 3, role: { code: 'IL_KOORDINATORU' }, provinceId: 25 }, { project })).toBe(true);
    expect(canManageTask({ id: 8, role: { code: 'EDITOR' } }, { project })).toBe(false);
  });
});
