import { describe, expect, it } from 'vitest';
import { buildProjectReadScope, canAssignProjectAuthor, canCreateProject, canManageProject } from '../api/v1/_lib/project-access.js';
import { formatProjectDto } from '../api/v1/_lib/project-dto.js';

describe('Project read scope', () => {
  it('allows GENEL and MUHASEBE global read access', () => {
    expect(buildProjectReadScope({ role: { code: 'GENEL_KOORDINATOR' } })).toEqual({});
    expect(buildProjectReadScope({ role: { code: 'MUHASEBE' } })).toEqual({});
  });

  it('scopes BOLGE by assigned region and fails closed without it', () => {
    expect(buildProjectReadScope({ id: 7, role: { code: 'BOLGE_KOORDINATORU' }, assignedRegion: 'Marmara' })).toEqual({
      OR: [
        { coordinatorId: 7 },
        { projectAuthors: { some: { authorProfile: { province: { region: 'Marmara' } } } } }
      ]
    });
    expect(buildProjectReadScope({ role: { code: 'BOLGE_KOORDINATORU' } })).toEqual({ id: -1 });
  });

  it('scopes IL by province and fails closed without it', () => {
    expect(buildProjectReadScope({ id: 8, role: { code: 'IL_KOORDINATORU' }, provinceId: 34 })).toEqual({
      OR: [
        { coordinatorId: 8 },
        { projectAuthors: { some: { authorProfile: { provinceId: 34 } } } }
      ]
    });
    expect(buildProjectReadScope({ role: { code: 'IL_KOORDINATORU' } })).toEqual({ id: -1 });
  });

  it('scopes EDITOR by branches, geography and optional grade', () => {
    expect(buildProjectReadScope({ role: { code: 'EDITOR' }, editorBranchId: 7, provinceId: 34 })).toEqual({
      branchId: { in: [7] },
      projectAuthors: { some: { authorProfile: { provinceId: 34 } } }
    });
    expect(buildProjectReadScope({ role: { code: 'EDITOR' }, branchAssignments: [{ branchId: 7 }, { branchId: 8 }], assignedRegion: 'Marmara', editorGrade: '8. Sınıf' })).toEqual({
      branchId: { in: [7, 8] },
      projectAuthors: { some: { authorProfile: { province: { region: 'Marmara' } } } },
      targetGrade: '8. Sınıf'
    });
    expect(buildProjectReadScope({ role: { code: 'EDITOR' }, editorBranchId: 7 })).toEqual({ id: -1 });
  });

  it('scopes YAZAR by ProjectAuthor and fails closed without AuthorProfile', () => {
    expect(buildProjectReadScope({ role: { code: 'YAZAR' }, AuthorProfile: { id: 12 } })).toEqual({
      projectAuthors: { some: { authorProfileId: 12 } }
    });
    expect(buildProjectReadScope({ role: { code: 'YAZAR' }, AuthorProfile: null })).toEqual({ id: -1 });
  });

  it('limits project creation to coordinator hierarchy', () => {
    expect(canCreateProject({ role: { code: 'GENEL_KOORDINATOR' } })).toBe(true);
    expect(canCreateProject({ role: { code: 'BOLGE_KOORDINATORU' } })).toBe(true);
    expect(canCreateProject({ role: { code: 'IL_KOORDINATORU' } })).toBe(true);
    expect(canCreateProject({ role: { code: 'EDITOR' } })).toBe(false);
    expect(canCreateProject({ role: { code: 'YAZAR' } })).toBe(false);
  });

  it('lets coordinators manage only projects whose authors remain inside scope', () => {
    const marmaraProject = {
      coordinatorId: 99,
      projectAuthors: [
        { authorProfile: { province: { id: 34, region: 'Marmara' } } },
        { authorProfile: { province: { id: 16, region: 'Marmara' } } }
      ]
    };
    expect(canManageProject({ id: 1, role: { code: 'GENEL_KOORDINATOR' } }, marmaraProject)).toBe(true);
    expect(canManageProject({ id: 1, role: { code: 'BOLGE_KOORDINATORU' }, assignedRegion: 'Marmara' }, marmaraProject)).toBe(true);
    expect(canManageProject({ id: 1, role: { code: 'BOLGE_KOORDINATORU' }, assignedRegion: 'Ege' }, marmaraProject)).toBe(false);
    expect(canManageProject({ id: 1, role: { code: 'IL_KOORDINATORU' }, provinceId: 34 }, marmaraProject)).toBe(false);
    expect(canManageProject({ id: 99, role: { code: 'BOLGE_KOORDINATORU' }, assignedRegion: 'Marmara' }, { coordinatorId: 99, projectAuthors: [] })).toBe(true);
  });

  it('validates project author geographic scope and active YAZAR status', () => {
    const author = {
      status: 'Aktif',
      user: { status: 'Aktif', role: { code: 'YAZAR' } },
      province: { id: 25, region: 'Doğu Anadolu' }
    };
    expect(canAssignProjectAuthor({ role: { code: 'GENEL_KOORDINATOR' } }, author)).toBe(true);
    expect(canAssignProjectAuthor({ role: { code: 'IL_KOORDINATORU' }, provinceId: 25 }, author)).toBe(true);
    expect(canAssignProjectAuthor({ role: { code: 'IL_KOORDINATORU' }, provinceId: 34 }, author)).toBe(false);
    expect(canAssignProjectAuthor({ role: { code: 'EDITOR' } }, author)).toBe(false);
  });

  it('rejects unknown roles', () => {
    expect(buildProjectReadScope({ role: { code: 'UNKNOWN' } })).toBeNull();
  });
});

describe('Project DTO', () => {
  it('returns stable public fields without private author data', () => {
    const dto = formatProjectDto({
      id: 1,
      title: 'Pilot',
      code: 'PILOT-1',
      projectType: 'Soru Bankası',
      progress: 0,
      deadline: new Date('2027-06-30T00:00:00.000Z'),
      status: 'Devam_Ediyor',
      priority: 'Normal',
      targetGrade: '8. Sınıf',
      description: 'Pilot project',
      createdAt: new Date('2026-10-08T00:00:00.000Z'),
      updatedAt: new Date('2026-10-08T00:00:00.000Z'),
      branch: { id: 2, name: 'Matematik' },
      projectAuthors: [{
        authorProfileId: 3,
        authorProfile: {
          user: { id: 4, fullName: 'Pilot Yazar', passwordHash: 'must-not-leak' },
          province: { id: 34, name: 'İstanbul', region: 'Marmara' },
          iban: 'must-not-leak'
        }
      }]
    } as any);

    expect(dto.authors[0]).toEqual({
      id: 4,
      fullName: 'Pilot Yazar',
      authorProfileId: 3,
      province: { id: 34, name: 'İstanbul', region: 'Marmara' }
    });
    expect(JSON.stringify(dto)).not.toContain('passwordHash');
    expect(JSON.stringify(dto)).not.toContain('iban');
  });
});
