import { describe, expect, it } from 'vitest';
import {
  audienceMatches, canPublishAnnouncement, targetInAnnouncementScope,
  validateAnnouncementAudience
} from '../api/v1/_lib/announcement-access.js';

const user = (overrides: any = {}) => ({
  id: 20,
  status: 'Aktif',
  role: { code: 'YAZAR' },
  assignedRegion: null,
  provinceId: null,
  province: null,
  AuthorProfile: { province: { id: 25, region: 'Doğu Anadolu' } },
  ...overrides
});

describe('announcement access', () => {
  it('limits publishing to coordinator hierarchy', () => {
    expect(canPublishAnnouncement({ role: { code: 'GENEL_KOORDINATOR' } })).toBe(true);
    expect(canPublishAnnouncement({ role: { code: 'BOLGE_KOORDINATORU' } })).toBe(true);
    expect(canPublishAnnouncement({ role: { code: 'IL_KOORDINATORU' } })).toBe(true);
    expect(canPublishAnnouncement({ role: { code: 'EDITOR' } })).toBe(false);
    expect(canPublishAnnouncement({ role: { code: 'YAZAR' } })).toBe(false);
  });

  it('maps simple role audiences without embedding geography in the audience field', () => {
    expect(audienceMatches('Tümü','YAZAR')).toBe(true);
    expect(audienceMatches('Koordinatörler','IL_KOORDINATORU')).toBe(true);
    expect(audienceMatches('Koordinatörler','EDITOR')).toBe(false);
    expect(audienceMatches('Editörler','EDITOR')).toBe(true);
    expect(audienceMatches('Yazarlar','YAZAR')).toBe(true);
    expect(audienceMatches('Muhasebe','MUHASEBE')).toBe(true);
  });

  it('scopes a region publisher to own region while retaining general oversight', () => {
    const actor = { id: 1, role: { code: 'BOLGE_KOORDINATORU' }, assignedRegion: 'Doğu Anadolu' };
    expect(targetInAnnouncementScope(actor, user())).toBe(true);
    expect(targetInAnnouncementScope(actor, user({ AuthorProfile: { province: { id: 34, region: 'Marmara' } } }))).toBe(false);
    expect(targetInAnnouncementScope(actor, user({ role: { code: 'GENEL_KOORDINATOR' }, AuthorProfile: null }))).toBe(true);
    expect(targetInAnnouncementScope(actor, user({ role: { code: 'MUHASEBE' }, AuthorProfile: null }))).toBe(false);
  });

  it('scopes a province publisher to own province and parent oversight', () => {
    const actor = {
      id: 2,
      role: { code: 'IL_KOORDINATORU' },
      provinceId: 25,
      announcementProvince: { id: 25, region: 'Doğu Anadolu' }
    };
    expect(targetInAnnouncementScope(actor, user())).toBe(true);
    expect(targetInAnnouncementScope(actor, user({ AuthorProfile: { province: { id: 24, region: 'Doğu Anadolu' } } }))).toBe(false);
    expect(targetInAnnouncementScope(actor, user({ role: { code: 'BOLGE_KOORDINATORU' }, assignedRegion: 'Doğu Anadolu', AuthorProfile: null }))).toBe(true);
  });

  it('reserves accounting-targeted publication for general coordinator', () => {
    expect(validateAnnouncementAudience({ role: { code: 'GENEL_KOORDINATOR' } }, 'Muhasebe')).toBe(true);
    expect(validateAnnouncementAudience({ role: { code: 'BOLGE_KOORDINATORU' } }, 'Muhasebe')).toBe(false);
    expect(validateAnnouncementAudience({ role: { code: 'IL_KOORDINATORU' } }, 'Yazarlar')).toBe(true);
  });
});
