import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from './prisma.js';
import { canMessageRecipient, canUseMessages } from './message-access.js';

const recipientSelect = {
  id: true,
  fullName: true,
  status: true,
  assignedRegion: true,
  provinceId: true,
  editorBranchId: true,
  role: { select: { code: true, name: true } },
  province: { select: { id: true, name: true, region: true } },
  branchAssignments: { select: { branchId: true } },
  AuthorProfile: {
    select: {
      id: true,
      branchId: true,
      provinceId: true,
      branch: { select: { id: true, name: true } },
      province: { select: { id: true, name: true, region: true } }
    }
  },
  _count: { select: { Payment: true } }
} as const;

const messageSelect = {
  id: true,
  subject: true,
  body: true,
  isRead: true,
  isArchived: true,
  createdAt: true,
  senderId: true,
  receiverId: true,
  sender: {
    select: {
      id: true,
      fullName: true,
      role: { select: { code: true, name: true } },
      province: { select: { id: true, name: true, region: true } },
      AuthorProfile: { select: { province: { select: { id: true, name: true, region: true } } } }
    }
  },
  receiver: {
    select: {
      id: true,
      fullName: true,
      role: { select: { code: true, name: true } },
      province: { select: { id: true, name: true, region: true } },
      AuthorProfile: { select: { province: { select: { id: true, name: true, region: true } } } }
    }
  }
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

async function actorContext(user: any) {
  const provinceId = user.provinceId ?? user.AuthorProfile?.provinceId ?? null;
  const messageProvince = provinceId
    ? await prisma.province.findUnique({ where: { id: provinceId }, select: { id: true, name: true, region: true } })
    : null;
  return { ...user, messageProvince };
}

function personDto(user: any) {
  const province = user.province ?? user.AuthorProfile?.province ?? null;
  return {
    id: user.id,
    fullName: user.fullName,
    role: user.role,
    province,
    branch: user.AuthorProfile?.branch ?? null
  };
}

function messageDto(message: any, currentUserId: number) {
  return {
    id: message.id,
    subject: message.subject,
    body: message.body,
    isRead: message.isRead,
    isArchived: message.isArchived,
    createdAt: message.createdAt,
    direction: message.senderId === currentUserId ? 'sent' : 'received',
    sender: personDto(message.sender),
    receiver: personDto(message.receiver)
  };
}

async function countsFor(userId: number) {
  const [inbox, unread, archived, sent] = await Promise.all([
    prisma.message.count({ where: { receiverId: userId, isArchived: false } }),
    prisma.message.count({ where: { receiverId: userId, isArchived: false, isRead: false } }),
    prisma.message.count({ where: { receiverId: userId, isArchived: true } }),
    prisma.message.count({ where: { senderId: userId } })
  ]);
  return { inbox, unread, archived, sent };
}

export async function handleMessageAction(
  req: VercelRequest,
  res: VercelResponse,
  user: any,
  action: 'messages' | 'message' | 'messageRecipients'
) {
  if (!canUseMessages(user)) return res.status(403).json({ error: 'Forbidden' });

  if (action === 'messageRecipients') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    return listRecipients(user, res);
  }

  if (action === 'messages') {
    if (req.method === 'GET') return listMessages(user, req, res);
    if (req.method === 'POST') return sendMessage(user, req, res);
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = positiveInt(req.query.id);
  if (!id) return res.status(400).json({ error: 'Invalid message id' });
  if (req.method === 'GET') return getMessage(id, user, res);
  if (req.method === 'PATCH') return updateMessage(id, user, req, res);
  res.setHeader('Allow', ['GET', 'PATCH']);
  return res.status(405).json({ error: 'Method not allowed' });
}

async function listRecipients(user: any, res: VercelResponse) {
  const actor = await actorContext(user);
  const users = await prisma.user.findMany({
    where: { status: { equals: 'Aktif', mode: 'insensitive' } },
    select: recipientSelect,
    orderBy: [{ fullName: 'asc' }, { id: 'asc' }]
  });
  const recipients = users.filter((target) => canMessageRecipient(actor, target)).map(personDto);
  return res.status(200).json({ recipients });
}

async function listMessages(user: any, req: VercelRequest, res: VercelResponse) {
  const box = typeof req.query.box === 'string' ? req.query.box : 'inbox';
  let where: any;
  if (box === 'inbox') where = { receiverId: user.id, isArchived: false };
  else if (box === 'sent') where = { senderId: user.id };
  else if (box === 'archive') where = { receiverId: user.id, isArchived: true };
  else return res.status(400).json({ error: 'Invalid mailbox' });

  const [messages, counts] = await Promise.all([
    prisma.message.findMany({ where, select: messageSelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }),
    countsFor(user.id)
  ]);

  return res.status(200).json({
    messages: messages.map((message) => messageDto(message, user.id)),
    counts
  });
}

async function getMessage(id: number, user: any, res: VercelResponse) {
  const message = await prisma.message.findFirst({
    where: { id, OR: [{ senderId: user.id }, { receiverId: user.id }] },
    select: messageSelect
  });
  if (!message) return res.status(404).json({ error: 'Message not found' });

  if (message.receiverId === user.id && !message.isRead) {
    await prisma.message.update({ where: { id }, data: { isRead: true } });
    message.isRead = true;
  }

  return res.status(200).json({ message: messageDto(message, user.id), counts: await countsFor(user.id) });
}

async function sendMessage(user: any, req: VercelRequest, res: VercelResponse) {
  const receiverId = positiveInt(req.body?.receiverId);
  const subject = clean(req.body?.subject, 180, 2);
  const body = clean(req.body?.body, 5000, 2);
  if (!receiverId || !subject || !body) return res.status(400).json({ error: 'Invalid message fields' });

  const [actor, receiver] = await Promise.all([
    actorContext(user),
    prisma.user.findUnique({ where: { id: receiverId }, select: recipientSelect })
  ]);
  if (!receiver || !canMessageRecipient(actor, receiver)) {
    return res.status(403).json({ error: 'Recipient is outside your messaging scope' });
  }

  const created = await prisma.$transaction(async (tx: any) => {
    const message = await tx.message.create({
      data: { senderId: user.id, receiverId, subject, body },
      select: messageSelect
    });
    await tx.notification.create({
      data: {
        userId: receiverId,
        title: 'Yeni mesaj',
        message: user.fullName + ': ' + subject,
        type: 'message',
        link: 'messages'
      }
    });
    await tx.activityLog.create({
      data: {
        userName: user.fullName,
        action: 'MESSAGE_SENT',
        entityType: 'Message',
        entityId: message.id,
        details: JSON.stringify({ receiverId, subject })
      }
    });
    return message;
  });

  return res.status(201).json({ message: messageDto(created, user.id), counts: await countsFor(user.id) });
}

async function updateMessage(id: number, user: any, req: VercelRequest, res: VercelResponse) {
  const message = await prisma.message.findUnique({ where: { id }, select: messageSelect });
  if (!message || message.receiverId !== user.id) {
    return res.status(404).json({ error: 'Message not found' });
  }

  const operation = req.body?.action;
  if (!['read','unread','archive','restore'].includes(operation)) {
    return res.status(400).json({ error: 'Invalid message action' });
  }

  const data: any = {};
  if (operation === 'read') data.isRead = true;
  if (operation === 'unread') data.isRead = false;
  if (operation === 'archive') data.isArchived = true;
  if (operation === 'restore') data.isArchived = false;

  const updated = await prisma.$transaction(async (tx: any) => {
    const changed = await tx.message.update({ where: { id }, data, select: messageSelect });
    if (operation === 'archive' || operation === 'restore') {
      await tx.activityLog.create({
        data: {
          userName: user.fullName,
          action: operation === 'archive' ? 'MESSAGE_ARCHIVED' : 'MESSAGE_RESTORED',
          entityType: 'Message',
          entityId: id
        }
      });
    }
    return changed;
  });

  return res.status(200).json({ message: messageDto(updated, user.id), counts: await countsFor(user.id) });
}
