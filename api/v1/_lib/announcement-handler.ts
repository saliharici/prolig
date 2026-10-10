import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from './prisma.js';
import {
  announcementAudiences, audienceMatches, canPublishAnnouncement,
  targetInAnnouncementScope, validateAnnouncementAudience
} from './announcement-access.js';

const priorities = new Set(['Dusuk','Normal','Yuksek','Acil']);
const recipientSelect = {
  id: true,
  fullName: true,
  status: true,
  assignedRegion: true,
  provinceId: true,
  role: { select: { code: true, name: true } },
  province: { select: { id: true, name: true, region: true } },
  AuthorProfile: { select: { province: { select: { id: true, name: true, region: true } } } }
} as const;

function positiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) return Number(value);
  return null;
}

function clean(value: unknown, max: number, min = 1): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length >= min && text.length <= max ? text : null;
}

function linkFor(id: number) {
  return `announcement:${id}`;
}

function parseCreatorId(details: string | null | undefined): number | null {
  if (!details) return null;
  try {
    const parsed = JSON.parse(details);
    return positiveInt(parsed?.userId);
  } catch {
    return null;
  }
}

async function actorContext(user: any) {
  const provinceId = user.provinceId ?? user.AuthorProfile?.provinceId ?? null;
  const announcementProvince = provinceId
    ? await prisma.province.findUnique({ where: { id: provinceId }, select: { id: true, name: true, region: true } })
    : null;
  return { ...user, announcementProvince };
}

async function resolveRecipients(actor: any, audience: string) {
  const context = await actorContext(actor);
  const users = await prisma.user.findMany({
    where: { status: { equals: 'Aktif', mode: 'insensitive' } },
    select: recipientSelect
  });

  const ids = users
    .filter((target) => targetInAnnouncementScope(context, target))
    .filter((target) => audienceMatches(audience, target.role.code))
    .map((target) => target.id);

  // Publisher must always retain access to the record even if not part of the target audience.
  if (!ids.includes(actor.id)) ids.push(actor.id);

  // Parent oversight is intentionally included even when the target audience is not coordinators.
  if (actor.role.code !== 'GENEL_KOORDINATOR') {
    for (const target of users) {
      if (target.role.code === 'GENEL_KOORDINATOR' && !ids.includes(target.id)) ids.push(target.id);
      if (
        actor.role.code === 'IL_KOORDINATORU'
        && target.role.code === 'BOLGE_KOORDINATORU'
        && context.announcementProvince?.region
        && target.assignedRegion === context.announcementProvince.region
        && !ids.includes(target.id)
      ) ids.push(target.id);
    }
  }

  return ids;
}

async function creationLogs(ids: number[]) {
  if (ids.length === 0) return new Map<number, number>();
  const logs = await prisma.activityLog.findMany({
    where: {
      entityType: 'Announcement',
      action: 'ANNOUNCEMENT_CREATED',
      entityId: { in: ids }
    },
    select: { entityId: true, details: true, createdAt: true },
    orderBy: { createdAt: 'asc' }
  });
  const map = new Map<number, number>();
  for (const log of logs) {
    if (!log.entityId || map.has(log.entityId)) continue;
    const creatorId = parseCreatorId(log.details);
    if (creatorId) map.set(log.entityId, creatorId);
  }
  return map;
}

async function canManage(user: any, announcementId: number) {
  if (user.role?.code === 'GENEL_KOORDINATOR') return true;
  if (!canPublishAnnouncement(user)) return false;
  const log = await prisma.activityLog.findFirst({
    where: { entityType: 'Announcement', entityId: announcementId, action: 'ANNOUNCEMENT_CREATED' },
    select: { details: true },
    orderBy: { createdAt: 'asc' }
  });
  return parseCreatorId(log?.details) === user.id;
}

async function unreadCount(userId: number) {
  return prisma.notification.count({
    where: { userId, type: 'announcement', isRead: false, link: { startsWith: 'announcement:' } }
  });
}

function dto(announcement: any, unreadLinks: Set<string>, manageable: boolean) {
  return {
    id: announcement.id,
    title: announcement.title,
    content: announcement.content,
    priority: announcement.priority,
    audience: announcement.audience,
    publishedAt: announcement.publishedAt,
    isArchived: announcement.isArchived,
    createdBy: announcement.createdBy,
    isUnread: unreadLinks.has(linkFor(announcement.id)),
    canManage: manageable
  };
}

export async function handleAnnouncementAction(
  req: VercelRequest,
  res: VercelResponse,
  user: any,
  action: 'announcements' | 'announcement'
) {
  if (action === 'announcements') {
    if (req.method === 'GET') return listAnnouncements(user, req, res);
    if (req.method === 'POST') return createAnnouncement(user, req, res);
    res.setHeader('Allow', ['GET','POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = positiveInt(req.query.id);
  if (!id) return res.status(400).json({ error: 'Invalid announcement id' });
  if (req.method === 'GET') return getAnnouncement(id, user, res);
  if (req.method === 'PATCH') return updateAnnouncement(id, user, req, res);
  res.setHeader('Allow', ['GET','PATCH']);
  return res.status(405).json({ error: 'Method not allowed' });
}

async function listAnnouncements(user: any, req: VercelRequest, res: VercelResponse) {
  const box = typeof req.query.box === 'string' ? req.query.box : 'active';
  if (!['active','archive'].includes(box)) return res.status(400).json({ error: 'Invalid announcement box' });

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id, type: 'announcement', link: { startsWith: 'announcement:' } },
    select: { link: true, isRead: true }
  });
  const ids = [...new Set(notifications.map((item) => positiveInt(item.link?.split(':')[1])).filter((id): id is number => Boolean(id)))];
  const unreadLinks = new Set(notifications.filter((item) => !item.isRead && item.link).map((item) => item.link as string));

  const announcements = ids.length
    ? await prisma.announcement.findMany({
        where: { id: { in: ids }, isArchived: box === 'archive' },
        orderBy: [{ priority: 'desc' }, { publishedAt: 'desc' }, { id: 'desc' }]
      })
    : [];

  const creators = await creationLogs(announcements.map((item) => item.id));
  const result = announcements.map((item) => dto(
    item,
    unreadLinks,
    user.role.code === 'GENEL_KOORDINATOR' || creators.get(item.id) === user.id
  ));

  return res.status(200).json({
    announcements: result,
    counts: {
      active: await prisma.announcement.count({ where: { id: { in: ids }, isArchived: false } }),
      archived: await prisma.announcement.count({ where: { id: { in: ids }, isArchived: true } }),
      unread: await unreadCount(user.id)
    },
    canPublish: canPublishAnnouncement(user),
    audiences: announcementAudiences
  });
}

async function getAnnouncement(id: number, user: any, res: VercelResponse) {
  const notification = await prisma.notification.findFirst({
    where: { userId: user.id, type: 'announcement', link: linkFor(id) },
    select: { id: true, isRead: true, link: true }
  });
  if (!notification) return res.status(404).json({ error: 'Announcement not found' });

  const announcement = await prisma.announcement.findUnique({ where: { id } });
  if (!announcement) return res.status(404).json({ error: 'Announcement not found' });

  if (!notification.isRead) {
    await prisma.notification.update({ where: { id: notification.id }, data: { isRead: true } });
  }

  return res.status(200).json({
    announcement: dto(announcement, new Set<string>(), await canManage(user, id)),
    unread: await unreadCount(user.id)
  });
}

async function createAnnouncement(user: any, req: VercelRequest, res: VercelResponse) {
  if (!canPublishAnnouncement(user)) return res.status(403).json({ error: 'Only coordinators can publish announcements' });

  const title = clean(req.body?.title, 180, 3);
  const content = clean(req.body?.content, 6000, 3);
  const priority = typeof req.body?.priority === 'string' && priorities.has(req.body.priority) ? req.body.priority : null;
  const audience = typeof req.body?.audience === 'string' ? req.body.audience : '';
  if (!title || !content || !priority || !validateAnnouncementAudience(user, audience)) {
    return res.status(400).json({ error: 'Invalid announcement fields' });
  }

  const recipientIds = await resolveRecipients(user, audience);
  if (recipientIds.length === 0) return res.status(409).json({ error: 'No recipients matched this announcement' });

  const created = await prisma.$transaction(async (tx: any) => {
    const announcement = await tx.announcement.create({
      data: {
        title,
        content,
        priority,
        audience,
        createdBy: user.fullName,
        publishedAt: new Date()
      }
    });

    await tx.notification.createMany({
      data: recipientIds.map((userId) => ({
        userId,
        title: 'Yeni duyuru',
        message: title,
        type: 'announcement',
        link: linkFor(announcement.id)
      }))
    });

    await tx.activityLog.create({
      data: {
        userName: user.fullName,
        action: 'ANNOUNCEMENT_CREATED',
        entityType: 'Announcement',
        entityId: announcement.id,
        details: JSON.stringify({
          userId: user.id,
          audience,
          recipientCount: recipientIds.length,
          actorRole: user.role.code,
          actorRegion: user.assignedRegion ?? null,
          actorProvinceId: user.provinceId ?? user.AuthorProfile?.provinceId ?? null
        })
      }
    });

    return announcement;
  });

  return res.status(201).json({
    announcement: dto(created, new Set([linkFor(created.id)]), true),
    unread: await unreadCount(user.id)
  });
}

async function updateAnnouncement(id: number, user: any, req: VercelRequest, res: VercelResponse) {
  const announcement = await prisma.announcement.findUnique({ where: { id } });
  if (!announcement || !(await canManage(user, id))) {
    return res.status(404).json({ error: 'Announcement not found or outside management scope' });
  }

  const operation = req.body?.action;
  if (operation !== undefined) {
    if (!['archive','restore'].includes(operation)) return res.status(400).json({ error: 'Invalid announcement action' });
    const isArchived = operation === 'archive';
    const updated = await prisma.$transaction(async (tx: any) => {
      const changed = await tx.announcement.update({ where: { id }, data: { isArchived } });
      await tx.activityLog.create({
        data: {
          userName: user.fullName,
          action: isArchived ? 'ANNOUNCEMENT_ARCHIVED' : 'ANNOUNCEMENT_RESTORED',
          entityType: 'Announcement',
          entityId: id
        }
      });
      return changed;
    });
    return res.status(200).json({ announcement: dto(updated, new Set<string>(), true), unread: await unreadCount(user.id) });
  }

  if (announcement.isArchived) return res.status(409).json({ error: 'Restore the announcement before editing' });

  const title = req.body?.title === undefined ? announcement.title : clean(req.body.title, 180, 3);
  const content = req.body?.content === undefined ? announcement.content : clean(req.body.content, 6000, 3);
  const priority = req.body?.priority === undefined
    ? announcement.priority
    : (typeof req.body.priority === 'string' && priorities.has(req.body.priority) ? req.body.priority : null);
  const audience = req.body?.audience === undefined ? announcement.audience : req.body.audience;
  if (!title || !content || !priority || typeof audience !== 'string' || !validateAnnouncementAudience(user, audience)) {
    return res.status(400).json({ error: 'Invalid announcement fields' });
  }

  const audienceChanged = audience !== announcement.audience;
  const recipientIds = audienceChanged ? await resolveRecipients(user, audience) : [];

  const updated = await prisma.$transaction(async (tx: any) => {
    const changed = await tx.announcement.update({
      where: { id },
      data: { title, content, priority, audience }
    });

    if (audienceChanged) {
      await tx.notification.deleteMany({ where: { type: 'announcement', link: linkFor(id) } });
      await tx.notification.createMany({
        data: recipientIds.map((userId) => ({
          userId,
          title: 'Güncellenen duyuru',
          message: title,
          type: 'announcement',
          link: linkFor(id)
        }))
      });
    } else {
      await tx.notification.updateMany({
        where: { type: 'announcement', link: linkFor(id) },
        data: { title: 'Güncellenen duyuru', message: title }
      });
    }

    await tx.activityLog.create({
      data: {
        userName: user.fullName,
        action: 'ANNOUNCEMENT_UPDATED',
        entityType: 'Announcement',
        entityId: id,
        details: JSON.stringify({ audienceChanged, audience })
      }
    });

    return changed;
  });

  return res.status(200).json({ announcement: dto(updated, new Set<string>(), true), unread: await unreadCount(user.id) });
}
