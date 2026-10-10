import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { DISTRICTS_BY_PROVINCE_ID, districtsForProvince, isDistrictInProvince } from '../shared/district-catalog';

describe('province district catalog', () => {
  it('contains all 81 provinces and 973 districts', () => {
    expect(Object.keys(DISTRICTS_BY_PROVINCE_ID)).toHaveLength(81);
    const count = Object.values(DISTRICTS_BY_PROVINCE_ID).reduce((sum, districts) => sum + districts.length, 0);
    expect(count).toBe(973);
  });

  it('binds Erzurum districts to province id 25', () => {
    const erzurum = districtsForProvince(25);
    for (const district of ['Yakutiye', 'Palandöken', 'Aziziye', 'Oltu', 'Pasinler']) {
      expect(erzurum).toContain(district);
      expect(isDistrictInProvince(25, district)).toBe(true);
    }
    expect(isDistrictInProvince(34, 'Yakutiye')).toBe(false);
  });

  it('uses dependent district selectors in membership and managed-author forms', () => {
    const publicForm = fs.readFileSync(path.resolve(__dirname, '../src/membership/MembershipApplicationScreen.tsx'), 'utf8');
    const memberForm = fs.readFileSync(path.resolve(__dirname, '../src/membership/MemberManagement.tsx'), 'utf8');
    const managementApi = fs.readFileSync(path.resolve(__dirname, '../api/v1/management.ts'), 'utf8');

    expect(publicForm).toContain("districtsForProvince(form.provinceId).map((district)");
    expect(publicForm).toContain("change('districtName', '')");
    expect(publicForm).toContain("disabled={!form.provinceId}");

    expect(memberForm).toContain("districtsForProvince(form.provinceId).map(district");
    expect(memberForm).toContain("districtName:app.districtName||''");
    expect(memberForm).toContain("districtName:u.authorProfile?.district?.name||''");

    expect(managementApi).toContain("isDistrictInProvince(provinceId, districtName)");
    expect(managementApi).toContain("tx.district.findFirst");
    expect(managementApi).toContain("districtId: district.id");
  });
});
