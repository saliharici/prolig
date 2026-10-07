import { describe, expect, it } from 'vitest';
import { buildProjectReadScope } from '../api/v1/_lib/project-access.js';
import { formatProjectDto } from '../api/v1/_lib/project-dto.js';

describe('Project read scope', () => {
  it('allows GENEL and MUHASEBE global read access', () => {
    expect(buildProjectReadScope({ role: { code: 'GENEL_KOORDINATOR' } })).toEqual({});
    expect(buildProjectReadScope({ role: { code: 'MUHASEBE' } })).toEqual({});
  });

  it('scopes BOLGE by assigned region and fails closed without it', () => {
    expect(buildProjectReadScope({ role: { code: 'BOLGE_KOORDINATORU' }, assignedRegion: 'Marmara' })).toEqual({
      projectAuthors: { some: { authorProfile: { province: { region: 'Marmara' } } } }
    });
    expect(buildProjectReadScope({ role: { code: 'BOLGE_KOORDINATORU' } })).toEqual({ id: -1 });
  });

  it('scopes IL by province and fails closed without it', () => {
    expect(buildProjectReadScope({ role: { code: 'IL_KOORDINATORU' }, provinceId: 34 })).toEqual({
      projectAuthors: { some: { authorProfile: { provinceId: 34 } } }
    });
    expect(buildProjectReadScope({ role: { code: 'IL_KOORDINATORU' } })).toEqual({ id: -1 });
  });

  it('scopes EDITOR by branch and optional grade and fails closed without branch', () => {
    expect(buildProjectReadScope({ role: { code: 'EDITOR' }, editorBranchId: 7 })).toEqual({ branchId: 7 });
    expect(buildProjectReadScope({ role: { code: 'EDITOR' }, editorBranchId: 7, editorGrade: '8. Sınıf' })).toEqual({ branchId: 7, targetGrade: '8. Sınıf' });
    expect(buildProjectReadScope({ role: { code: 'EDITOR' } })).toEqual({ id: -1 });
  });

  it('scopes YAZAR by ProjectAuthor and fails closed without AuthorProfile', () => {
    expect(buildProjectReadScope({ role: { code: 'YAZAR' }, AuthorProfile: { id: 12 } })).toEqual({
      projectAuthors: { some: { authorProfileId: 12 } }
    });
    expect(buildProjectReadScope({ role: { code: 'YAZAR' }, AuthorProfile: null })).toEqual({ id: -1 });
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
