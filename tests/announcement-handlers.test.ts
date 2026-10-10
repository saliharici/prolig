import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleAnnouncementAction } from '../api/v1/_lib/announcement-handler.js';
import { prisma } from '../api/v1/_lib/prisma.js';

vi.mock('../api/v1/_lib/prisma.js', () => ({
  prisma: {
    province: { findUnique: vi.fn() },
    user: { findMany: vi.fn() },
    announcement: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn()
    },
    notification: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn()
    },
    activityLog: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn()
    },
    $transaction: vi.fn()
  }
}));

function reqRes(method: string, body: any = {}, query: any = {}) {
  const req = { method, body, query, headers: {} } as VercelRequest;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn()
  } as unknown as VercelResponse;
  return { req, res };
}

const general = {
  id: 1,
  fullName: 'Genel Koordinatör',
  role: { code: 'GENEL_KOORDINATOR' },
  provinceId: null,
  assignedRegion: null,
  AuthorProfile: null
};

const region = {
  id: 2,
  fullName: 'Doğu Anadolu Bölge Koordinatörü',
  role: { code: 'BOLGE_KOORDINATORU' },
  provinceId: null,
  assignedRegion: 'Doğu Anadolu',
  AuthorProfile: null
};

const announcement = (overrides: any = {}) => ({
  id: 10,
  title: 'Teslim Takvimi',
  content: 'Soru teslimleri 18 Ekim tarihine kadar tamamlanmalıdır.',
  priority: 'Yuksek',
  audience: 'Yazarlar',
  publishedAt: new Date('2026-10-10T10:00:00.000Z'),
  isArchived: false,
  createdBy: 'Genel Koordinatör',
  ...overrides
});

const activeAuthor = {
  id: 30,
  fullName: 'Erzurum Yazarı',
  status: 'Aktif',
  assignedRegion: null,
  provinceId: null,
  role: { code: 'YAZAR', name: 'Yazar' },
  province: null,
  AuthorProfile: { province: { id: 25, name: 'Erzurum', region: 'Doğu Anadolu' } }
};

describe('announcement action handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(prisma as any));
    vi.mocked(prisma.notification.count).mockResolvedValue(0);
    vi.mocked(prisma.announcement.count).mockResolvedValue(0);
    vi.mocked(prisma.activityLog.findMany).mockResolvedValue([]);
  });

  it('lets canonical users read only announcements materialized to their notification map', async () => {
    vi.mocked(prisma.notification.findMany).mockResolvedValue([
      { link: 'announcement:10', isRead: false }
    ] as any);
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([announcement()] as any);
    vi.mocked(prisma.announcement.count).mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    vi.mocked(prisma.notification.count).mockResolvedValue(1);

    const { req, res } = reqRes('GET', {}, { box: 'active' });
    await handleAnnouncementAction(req, res, activeAuthor as any, 'announcements');

    expect(prisma.announcement.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: [10] }, isArchived: false }
    }));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      counts: { active: 1, archived: 0, unread: 1 },
      canPublish: false
    }));
  });

  it('creates a general announcement, recipient notifications and audit history', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        id: 1,
        fullName: 'Genel Koordinatör',
        status: 'Aktif',
        assignedRegion: null,
        provinceId: null,
        role: { code: 'GENEL_KOORDINATOR', name: 'Genel Koordinatör' },
        province: null,
        AuthorProfile: null
      },
      activeAuthor
    ] as any);
    vi.mocked(prisma.announcement.create).mockResolvedValue(announcement() as any);
    vi.mocked(prisma.notification.count).mockResolvedValue(1);

    const { req, res } = reqRes('POST', {
      title: 'Teslim Takvimi',
      content: 'Soru teslimleri 18 Ekim tarihine kadar tamamlanmalıdır.',
      priority: 'Yuksek',
      audience: 'Yazarlar'
    });
    await handleAnnouncementAction(req, res, general as any, 'announcements');

    expect(prisma.announcement.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        title: 'Teslim Takvimi',
        audience: 'Yazarlar',
        createdBy: 'Genel Koordinatör'
      })
    }));
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ userId: 30, type: 'announcement', link: 'announcement:10' }),
        expect.objectContaining({ userId: 1, type: 'announcement', link: 'announcement:10' })
      ])
    });
    expect(prisma.activityLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'ANNOUNCEMENT_CREATED',
        entityType: 'Announcement',
        entityId: 10
      })
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('prevents regional publishing to global accounting audience', async () => {
    const { req, res } = reqRes('POST', {
      title: 'Muhasebe Duyurusu',
      content: 'Bilgilendirme metni',
      priority: 'Normal',
      audience: 'Muhasebe'
    });
    await handleAnnouncementAction(req, res, region as any, 'announcements');

    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.announcement.create).not.toHaveBeenCalled();
  });

  it('marks announcement notification read on open', async () => {
    vi.mocked(prisma.notification.findFirst).mockResolvedValue({ id: 99, isRead: false, link: 'announcement:10' } as any);
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(announcement() as any);
    vi.mocked(prisma.activityLog.findFirst).mockResolvedValue({
      details: JSON.stringify({ userId: 1 })
    } as any);

    const { req, res } = reqRes('GET', {}, { id: '10' });
    await handleAnnouncementAction(req, res, activeAuthor as any, 'announcement');

    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 99 },
      data: { isRead: true }
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('allows creator or general coordinator to archive without hard delete', async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(announcement({ createdBy: region.fullName }) as any);
    vi.mocked(prisma.activityLog.findFirst).mockResolvedValue({
      details: JSON.stringify({ userId: 2 })
    } as any);
    vi.mocked(prisma.announcement.update).mockResolvedValue(announcement({ isArchived: true, createdBy: region.fullName }) as any);

    const { req, res } = reqRes('PATCH', { action: 'archive' }, { id: '10' });
    await handleAnnouncementAction(req, res, region as any, 'announcement');

    expect(prisma.announcement.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { isArchived: true }
    });
    expect(prisma.activityLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'ANNOUNCEMENT_ARCHIVED' })
    }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('does not expose permanent delete', async () => {
    const { req, res } = reqRes('DELETE', {}, { id: '10' });
    await handleAnnouncementAction(req, res, general as any, 'announcement');
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET','PATCH']);
  });
});
