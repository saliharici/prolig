import { describe, expect, it } from 'vitest';
import { buildAuthorReadScope } from '../api/v1/_lib/author-access.js';
import { formatAuthorDto } from '../api/v1/_lib/author-dto.js';

describe('Author read scope', () => {
  it('allows GENEL and MUHASEBE global read access', () => {
    expect(buildAuthorReadScope({ role: { code: 'GENEL_KOORDINATOR' } })).toEqual({});
    expect(buildAuthorReadScope({ role: { code: 'MUHASEBE' } })).toEqual({});
  });

  it('scopes BOLGE by region and fails closed without it', () => {
    expect(buildAuthorReadScope({ role: { code: 'BOLGE_KOORDINATORU' }, assignedRegion: 'Marmara' })).toEqual({
      province: { region: 'Marmara' }
    });
    expect(buildAuthorReadScope({ role: { code: 'BOLGE_KOORDINATORU' } })).toEqual({ id: -1 });
  });

  it('scopes IL by province and fails closed without it', () => {
    expect(buildAuthorReadScope({ role: { code: 'IL_KOORDINATORU' }, provinceId: 34 })).toEqual({ provinceId: 34 });
    expect(buildAuthorReadScope({ role: { code: 'IL_KOORDINATORU' } })).toEqual({ id: -1 });
  });

  it('scopes EDITOR by branches and geography', () => {
    expect(buildAuthorReadScope({ role: { code: 'EDITOR' }, editorBranchId: 2, provinceId: 34, editorGrade: '8. Sınıf' })).toEqual({
      branchId: { in: [2] }, provinceId: 34
    });
    expect(buildAuthorReadScope({ role: { code: 'EDITOR' }, branchAssignments: [{ branchId: 2 }, { branchId: 3 }], assignedRegion: 'Marmara' })).toEqual({
      branchId: { in: [2, 3] }, province: { region: 'Marmara' }
    });
    expect(buildAuthorReadScope({ role: { code: 'EDITOR' }, editorBranchId: 2 })).toEqual({ id: -1 });
  });

  it('scopes YAZAR to the own profile and fails closed without it', () => {
    expect(buildAuthorReadScope({ role: { code: 'YAZAR' }, AuthorProfile: { id: 12 } })).toEqual({ id: 12 });
    expect(buildAuthorReadScope({ role: { code: 'YAZAR' }, AuthorProfile: null })).toEqual({ id: -1 });
  });

  it('rejects unknown roles', () => {
    expect(buildAuthorReadScope({ role: { code: 'UNKNOWN' } })).toBeNull();
  });
});

describe('Author DTO', () => {
  it('returns stable public fields, unique grades, and active project count without private data', () => {
    const dto = formatAuthorDto({
      id: 3,
      userId: 4,
      title: 'Yazar / Öğretmen',
      experienceYears: 8,
      status: 'Aktif',
      user: { fullName: 'Pilot Yazar', passwordHash: 'must-not-leak', phone: 'must-not-leak' },
      branch: { id: 2, name: 'Matematik' },
      province: { id: 34, name: 'İİstanbul', region: 'Marmara' },
      district: { id: 1, name: 'Kadıköy' },
      institution: { id: 1, name: 'Pilot Okulu', type: 'Devlet Okulu' },
      iban: 'must-not-leak',
      biography: 'must-not-leak',
      projectAuthors: [
        { project: { status: 'Devam_Ediyor', targetGrade: '8. Sınıf' } },
        { project: { status: 'Tamamlandi', targetGrade: '8. Sınıf' } },
        { project: { status: 'Arsiv', targetGrade: '7. Sınıf' } }
      ]
    } as any);

    expect(dto).toEqual({
      id: 3,
      userId: 4,
      fullName: 'Pilot Yazar',
      title: 'Yazar / Öğretmen',
      experienceYears: 8,
      status: 'Aktif',
      branch: { id: 2, name: 'Matematik' },
      province: { id: 34, name: 'İİstanbul', region: 'Marmara' },
      district: { id: 1, name: 'Kadıköy' },
      institution: { id: 1, name: 'Pilot Okulu', type: 'Devlet Okulu' },
      activeProjectCount: 1,
      projectGrades: ['7. Sınıf', '8. Sınıf']
    });
    expect(JSON.stringify(dto)).not.toMatch(/passwordHash|phone|iban|biography/);
  });
});
