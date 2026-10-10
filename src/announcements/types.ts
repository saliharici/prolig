export type AnnouncementPriority = 'Dusuk' | 'Normal' | 'Yuksek' | 'Acil';
export type AnnouncementBox = 'active' | 'archive';
export type AnnouncementAudience = 'Tümü' | 'Koordinatörler' | 'Editörler' | 'Yazarlar' | 'Muhasebe';

export interface ApiAnnouncement {
  id: number;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience;
  publishedAt: string;
  isArchived: boolean;
  createdBy: string;
  isUnread: boolean;
  canManage: boolean;
}

export interface AnnouncementCounts {
  active: number;
  archived: number;
  unread: number;
}

export interface AnnouncementListResponse {
  announcements: ApiAnnouncement[];
  counts: AnnouncementCounts;
  canPublish: boolean;
  audiences: AnnouncementAudience[];
}
