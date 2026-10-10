import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleMessageAction } from '../api/v1/_lib/message-handler.js';
import { prisma } from '../api/v1/_lib/prisma.js';

vi.mock('../api/v1/_lib/prisma.js', () => ({
  prisma: {
    province: { findUnique: vi.fn() },
    user: { findMany: vi.fn(), findUnique: vi.fn() },
    message: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn()
    },
    notification: { create: vi.fn() },
    activityLog: { create: vi.fn() },
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

const receiver = {
  id: 30,
  fullName: 'Pilot Yazar',
  status: 'Aktif',
  assignedRegion: null,
  provinceId: null,
  editorBranchId: null,
  role: { code: 'YAZAR', name: 'Yazar' },
  province: null,
  branchAssignments: [],
  AuthorProfile: {
    id: 3,
    branchId: 2,
    provinceId: 25,
    branch: { id: 2, name: 'Matematik' },
    province: { id: 25, name: 'Erzurum', region: 'Doğu Anadolu' }
  },
  _count: { Payment: 0 }
};

function message(overrides: any = {}) {
  return {
    id: 50,
    subject: 'Soru teslimi',
    body: 'Teslim takvimini kontrol ediniz.',
    isRead: false,
    isArchived: false,
    createdAt: new Date('2026-10-10T10:00:00.000Z'),
    senderId: 1,
    receiverId: 30,
    sender: {
      id: 1,
      fullName: 'Genel Koordinatör',
      role: { code: 'GENEL_KOORDINATOR', name: 'Genel Koordinatör' },
      province: null,
      AuthorProfile: null
    },
    receiver: {
      id: 30,
      fullName: 'Pilot Yazar',
      role: { code: 'YAZAR', name: 'Yazar' },
      province: null,
      AuthorProfile: { province: { id: 25, name: 'Erzurum', region: 'Doğu Anadolu' } }
    },
    ...overrides
  };
}

describe('message action handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(prisma as any));
    vi.mocked(prisma.message.count).mockResolvedValue(0);
  });

  it('lists only current user mailbox and returns counts', async () => {
    vi.mocked(prisma.message.findMany).mockResolvedValue([message()] as any);
    const { req, res } = reqRes('GET', {}, { box: 'inbox' });
    await handleMessageAction(req, res, { ...general, id: 30, role: { code: 'YAZAR' }, AuthorProfile: { id: 3, provinceId: 25, branchId: 2 } }, 'messages');

    expect(prisma.message.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { receiverId: 30, isArchived: false }
    }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('sends only to an allowed active recipient and creates notification plus audit log', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(receiver as any);
    vi.mocked(prisma.message.create).mockResolvedValue(message() as any);

    const { req, res } = reqRes('POST', {
      receiverId: 30,
      subject: 'Soru teslimi',
      body: 'Teslim takvimini kontrol ediniz.'
    });
    await handleMessageAction(req, res, general, 'messages');

    expect(prisma.message.create).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        senderId: 1,
        receiverId: 30,
        subject: 'Soru teslimi',
        body: 'Teslim takvimini kontrol ediniz.'
      }
    }));
    expect(prisma.notification.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: 30, type: 'message', link: 'messages' })
    }));
    expect(prisma.activityLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'MESSAGE_SENT', entityType: 'Message', entityId: 50 })
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('rejects recipients outside messaging scope', async () => {
    vi.mocked(prisma.province.findUnique).mockResolvedValue({ id: 25, name: 'Erzurum', region: 'Doğu Anadolu' } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...receiver,
      AuthorProfile: { ...receiver.AuthorProfile, province: { id: 34, name: 'İstanbul', region: 'Marmara' } }
    } as any);

    const actor = {
      id: 5,
      fullName: 'Erzurum İl Koordinatörü',
      role: { code: 'IL_KOORDINATORU' },
      provinceId: 25,
      assignedRegion: null,
      AuthorProfile: null
    };
    const { req, res } = reqRes('POST', { receiverId: 30, subject: 'Konu', body: 'Mesaj' });
    await handleMessageAction(req, res, actor, 'messages');

    expect(res.status).toHaveBeenCalledWith(403);
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('marks received unread message read when opened', async () => {
    vi.mocked(prisma.message.findFirst).mockResolvedValue(message() as any);
    vi.mocked(prisma.message.update).mockResolvedValue(message({ isRead: true }) as any);
    const { req, res } = reqRes('GET', {}, { id: '50' });
    await handleMessageAction(req, res, { ...general, id: 30 }, 'message');

    expect(prisma.message.update).toHaveBeenCalledWith({ where: { id: 50 }, data: { isRead: true } });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('allows only receiver to archive and writes audit history', async () => {
    vi.mocked(prisma.message.findUnique).mockResolvedValue(message() as any);
    vi.mocked(prisma.message.update).mockResolvedValue(message({ isArchived: true }) as any);
    const receiverUser = { ...general, id: 30, fullName: 'Pilot Yazar', role: { code: 'YAZAR' }, AuthorProfile: { id: 3 } };

    const { req, res } = reqRes('PATCH', { action: 'archive' }, { id: '50' });
    await handleMessageAction(req, res, receiverUser, 'message');

    expect(prisma.message.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 50 },
      data: { isArchived: true }
    }));
    expect(prisma.activityLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'MESSAGE_ARCHIVED' })
    }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('does not expose delete operations', async () => {
    const { req, res } = reqRes('DELETE', {}, { id: '50' });
    await handleMessageAction(req, res, general, 'message');
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET','PATCH']);
  });
});
