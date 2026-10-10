const publisherRoles = new Set(['GENEL_KOORDINATOR','BOLGE_KOORDINATORU','IL_KOORDINATORU']);
export const announcementAudiences = ['Tümü','Koordinatörler','Editörler','Yazarlar','Muhasebe'] as const;

function provinceOf(user: any) {
  return user?.province ?? user?.AuthorProfile?.province ?? user?.announcementProvince ?? null;
}

export function canPublishAnnouncement(user: any): boolean {
  return publisherRoles.has(user?.role?.code);
}

export function audienceMatches(audience: string, targetRole: string): boolean {
  if (audience === 'Tümü') return true;
  if (audience === 'Koordinatörler') return ['GENEL_KOORDINATOR','BOLGE_KOORDINATORU','IL_KOORDINATORU'].includes(targetRole);
  if (audience === 'Editörler') return targetRole === 'EDITOR';
  if (audience === 'Yazarlar') return targetRole === 'YAZAR';
  if (audience === 'Muhasebe') return targetRole === 'MUHASEBE';
  return false;
}

export function targetInAnnouncementScope(actor: any, target: any): boolean {
  const actorRole = actor?.role?.code;
  const targetRole = target?.role?.code;
  if (!actorRole || !targetRole || target.status?.toUpperCase?.() !== 'AKTIF') return false;

  if (actorRole === 'GENEL_KOORDINATOR') return true;

  const actorProvince = provinceOf(actor);
  const targetProvince = provinceOf(target);

  if (actorRole === 'BOLGE_KOORDINATORU') {
    if (targetRole === 'GENEL_KOORDINATOR') return true; // oversight
    if (targetRole === 'MUHASEBE') return false;
    if (!actor.assignedRegion) return false;
    if (target.assignedRegion) return target.assignedRegion === actor.assignedRegion;
    return targetProvince?.region === actor.assignedRegion;
  }

  if (actorRole === 'IL_KOORDINATORU') {
    if (targetRole === 'GENEL_KOORDINATOR') return true; // oversight
    if (targetRole === 'BOLGE_KOORDINATORU') {
      return Boolean(actorProvince?.region) && target.assignedRegion === actorProvince.region;
    }
    if (targetRole === 'MUHASEBE') return false;
    return Boolean(actor.provinceId) && targetProvince?.id === actor.provinceId;
  }

  return false;
}

export function validateAnnouncementAudience(actor: any, audience: string): boolean {
  if (!announcementAudiences.includes(audience as any)) return false;
  if (actor?.role?.code !== 'GENEL_KOORDINATOR' && audience === 'Muhasebe') return false;
  return canPublishAnnouncement(actor);
}
