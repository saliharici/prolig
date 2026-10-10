import { describe, expect, it } from 'vitest';
import {
  buildApplicationReadScope,
  buildUserReadScope,
  canAssignRole,
  canManageUserLifecycle,
  canViewProvince,
  editorBranchIds
} from '../api/v1/_lib/member-access.js';

describe('member scope helpers', () => {
  it('deduplicates assigned editor branches and falls back to legacy editorBranchId', () => {
    expect(editorBranchIds({ branchAssignments: [{ branchId: 2 }, { branchId: 2 }, { branchId: 3 }], editorBranchId: 9 })).toEqual([2, 3]);
    expect(editorBranchIds({ branchAssignments: [], editorBranchId: 9 })).toEqual([9]);
  });

  it('scopes applications for general, region and province coordinators', () => {
    expect(buildApplicationReadScope({ role: { code: 'GENEL_KOORDINATOR' } })).toEqual({});
    expect(buildApplicationReadScope({ role: { code: 'BOLGE_KOORDINATORU' }, assignedRegion: 'Doğu Anadolu' })).toEqual({
      province: { region: 'Doğu Anadolu' }
    });
    expect(buildApplicationReadScope({ role: { code: 'IL_KOORDINATORU' }, provinceId: 25 })).toEqual({ provinceId: 25 });
    expect(buildApplicationReadScope({ role: { code: 'BOLGE_KOORDINATORU' } })).toEqual({ id: -1 });
  });

  it('scopes user listing by coordinator geography', () => {
    expect(buildUserReadScope({ role: { code: 'GENEL_KOORDINATOR' } })).toEqual({});
    expect(buildUserReadScope({ role: { code: 'BOLGE_KOORDINATORU' }, assignedRegion: 'Marmara' })).toEqual({
      OR: [
        { assignedRegion: 'Marmara' },
        { province: { region: 'Marmara' } },
        { AND: [{ role: { code: 'YAZAR' } }, { AuthorProfile: { province: { region: 'Marmara' } } }] }
      ]
    });
    expect(buildUserReadScope({ role: { code: 'IL_KOORDINATORU' }, provinceId: 34 })).toEqual({
      OR: [{ provinceId: 34 }, { AND: [{ role: { code: 'YAZAR' } }, { AuthorProfile: { provinceId: 34 } }] }]
    });
  });

  it('enforces geographic visibility', () => {
    const erzurum = { id: 25, region: 'Doğu Anadolu' };
    expect(canViewProvince({ role: { code: 'GENEL_KOORDINATOR' } }, erzurum)).toBe(true);
    expect(canViewProvince({ role: { code: 'BOLGE_KOORDINATORU' }, assignedRegion: 'Doğu Anadolu' }, erzurum)).toBe(true);
    expect(canViewProvince({ role: { code: 'BOLGE_KOORDINATORU' }, assignedRegion: 'Marmara' }, erzurum)).toBe(false);
    expect(canViewProvince({ role: { code: 'IL_KOORDINATORU' }, provinceId: 25 }, erzurum)).toBe(true);
    expect(canViewProvince({ role: { code: 'IL_KOORDINATORU' }, provinceId: 34 }, erzurum)).toBe(false);
  });

  it('enforces hierarchical role assignment for general, region and province coordinators', () => {
    const general = { role: { code: 'GENEL_KOORDINATOR' } };
    for (const role of ['GENEL_KOORDINATOR','BOLGE_KOORDINATORU','IL_KOORDINATORU','EDITOR','YAZAR','MUHASEBE']) {
      expect(canAssignRole(general, role)).toBe(true);
    }
    const region = { role: { code: 'BOLGE_KOORDINATORU' } };
    expect(canAssignRole(region, 'IL_KOORDINATORU')).toBe(true);
    expect(canAssignRole(region, 'EDITOR')).toBe(true);
    expect(canAssignRole(region, 'YAZAR')).toBe(true);
    expect(canAssignRole(region, 'BOLGE_KOORDINATORU')).toBe(false);
    expect(canAssignRole(region, 'GENEL_KOORDINATOR')).toBe(false);
    expect(canAssignRole(region, 'MUHASEBE')).toBe(false);

    const province = { role: { code: 'IL_KOORDINATORU' } };
    expect(canAssignRole(province, 'EDITOR')).toBe(true);
    expect(canAssignRole(province, 'YAZAR')).toBe(true);
    expect(canAssignRole(province, 'IL_KOORDINATORU')).toBe(false);
    expect(canAssignRole(province, 'BOLGE_KOORDINATORU')).toBe(false);
    expect(canAssignRole(province, 'GENEL_KOORDINATOR')).toBe(false);
    expect(canAssignRole(province, 'MUHASEBE')).toBe(false);
  });

  it('enforces member lifecycle hierarchy and protects peer General Coordinators', () => {
    const general = { role: { code: 'GENEL_KOORDINATOR' } };
    expect(canManageUserLifecycle(general, { role: { code: 'BOLGE_KOORDINATORU' } })).toBe(true);
    expect(canManageUserLifecycle(general, { role: { code: 'MUHASEBE' } })).toBe(true);
    expect(canManageUserLifecycle(general, { role: { code: 'GENEL_KOORDINATOR' } })).toBe(false);

    const region = { role: { code: 'BOLGE_KOORDINATORU' } };
    expect(canManageUserLifecycle(region, { role: { code: 'IL_KOORDINATORU' } })).toBe(true);
    expect(canManageUserLifecycle(region, { role: { code: 'EDITOR' } })).toBe(true);
    expect(canManageUserLifecycle(region, { role: { code: 'YAZAR' } })).toBe(true);
    expect(canManageUserLifecycle(region, { role: { code: 'MUHASEBE' } })).toBe(false);

    const province = { role: { code: 'IL_KOORDINATORU' } };
    expect(canManageUserLifecycle(province, { role: { code: 'EDITOR' } })).toBe(true);
    expect(canManageUserLifecycle(province, { role: { code: 'YAZAR' } })).toBe(true);
    expect(canManageUserLifecycle(province, { role: { code: 'IL_KOORDINATORU' } })).toBe(false);
  });

});
