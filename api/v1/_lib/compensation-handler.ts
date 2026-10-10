import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sumMoney } from './settlement-money.js';
import { prisma } from './prisma.js';

const roleRuleMap = {
  YAZAR: { earningType: 'QUESTION_AUTHOR', unitType: 'QUESTION' },
  EDITOR: { earningType: 'QUESTION_EDITOR', unitType: 'QUESTION' },
  IL_KOORDINATORU: { earningType: 'PROJECT_PROVINCE_COORDINATOR', unitType: 'PROJECT' },
  BOLGE_KOORDINATORU: { earningType: 'PROJECT_REGION_COORDINATOR', unitType: 'PROJECT' },
  GENEL_KOORDINATOR: { earningType: 'PROJECT_GENERAL_COORDINATOR', unitType: 'PROJECT' }
} as const;

type CompensationRole = keyof typeof roleRuleMap;

const ruleSelect = {
  id: true,
  roleCode: true,
  earningType: true,
  unitType: true,
  unitPrice: true,
  projectId: true,
  validFrom: true,
  validTo: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  project: { select: { id: true, title: true, code: true, status: true } },
  createdByUser: { select: { id: true, fullName: true } }
} as const;

const entrySelect = {
  id: true,
  roleCode: true,
  earningType: true,
  quantity: true,
  unitPrice: true,
  amount: true,
  status: true,
  earnedAt: true,
  approvedAt: true,
  paidAt: true,
  sourceKey: true,
  questionId: true,
  paymentPeriod: { select: { id: true, code: true, name: true } },
  payment: { select: { id: true, status: true, paymentDate: true } },
  user: { select: { id: true, fullName: true } },
  project: { select: { id: true, title: true, code: true } },
  rule: { select: { id: true, unitType: true } }
} as const;

function positiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

function parseMoney(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const raw = String(value).trim().replace(',', '.');
  if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(raw)) return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 9999999999.99) return null;
  return amount.toFixed(2);
}

function entryDto(entry: any) {
  return {
    id: entry.id,
    roleCode: entry.roleCode,
    earningType: entry.earningType,
    quantity: entry.quantity,
    unitPrice: entry.unitPrice.toFixed(2),
    amount: entry.amount.toFixed(2),
    status: entry.status,
    earnedAt: entry.earnedAt,
    approvedAt: entry.approvedAt,
    paidAt: entry.paidAt,
    sourceKey: entry.sourceKey,
    questionId: entry.questionId,
    paymentPeriod: entry.paymentPeriod ?? null,
    payment: entry.payment ?? null,
    user: entry.user,
    project: entry.project,
    unitType: entry.rule.unitType
  };
}

function ruleDto(rule: any) {
  return {
    id: rule.id,
    roleCode: rule.roleCode,
    earningType: rule.earningType,
    unitType: rule.unitType,
    unitPrice: rule.unitPrice.toFixed(2),
    projectId: rule.projectId,
    project: rule.project,
    validFrom: rule.validFrom,
    validTo: rule.validTo,
    isActive: rule.isActive,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
    createdBy: rule.createdByUser
  };
}

function canReadRules(user: any) {
  return ['GENEL_KOORDINATOR', 'MUHASEBE'].includes(user?.role?.code);
}

function canManageRules(user: any) {
  return user?.role?.code === 'GENEL_KOORDINATOR';
}

export async function handleCompensationAction(
  req: VercelRequest,
  res: VercelResponse,
  user: any,
  action: 'compensationRules' | 'compensationRule' | 'compensationEntries'
) {
  if (action === 'compensationEntries') {
    if (!user?.id || !['GENEL_KOORDINATOR', 'MUHASEBE', 'YAZAR', 'EDITOR', 'IL_KOORDINATORU', 'BOLGE_KOORDINATORU'].includes(user?.role?.code)) return res.status(403).json({ error: 'Forbidden' });
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    return listEntries(req, res, user);
  }

  if (!canReadRules(user)) return res.status(403).json({ error: 'Forbidden' });

  if (action === 'compensationRules') {
    if (req.method === 'GET') return listRules(req, res);
    if (req.method === 'POST') return createRule(req, res, user);
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = positiveInt(req.query.id);
  if (!id) return res.status(400).json({ error: 'Invalid compensation rule id' });
  if (req.method === 'PATCH') return deactivateRule(id, req, res, user);
  res.setHeader('Allow', ['PATCH']);
  return res.status(405).json({ error: 'Method not allowed' });
}

async function listEntries(req: VercelRequest, res: VercelResponse, user: any) {
  const rawLimit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 200;
  const limit = Number.isSafeInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 500) : 200;
  const cursor = req.query.cursor == null ? null : positiveInt(req.query.cursor);
  if (req.query.cursor != null && !cursor) return res.status(400).json({ error: 'Invalid cursor' });
  // Query/body userId can never widen an authenticated user's financial scope.
  const where = canReadRules(user) ? {} : { userId: user.id };
  if (cursor) {
    const ownCursor = await prisma.compensationEntry.findFirst({ where: { ...where, id: cursor }, select: { id: true } });
    if (!ownCursor) return res.status(400).json({ error: 'Invalid cursor' });
  }
  const result = await prisma.$transaction(async tx => {
    const entries = await tx.compensationEntry.findMany({
      where, select: entrySelect,
      orderBy: [{ earnedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    });
    const groups = await tx.compensationEntry.groupBy({ by: ['status', 'roleCode'], where, _sum: { amount: true }, _count: { _all: true } });
    const sum = (predicate: (group: typeof groups[number]) => boolean) => sumMoney(groups.filter(predicate).map(group => group._sum.amount ?? '0'));
    const summary = {
      count: groups.reduce((count, group) => count + group._count._all, 0),
      total: sum(group => group.status !== 'IPTAL'),
      waiting: sum(group => group.status === 'HAK_EDILDI' || group.status === 'ODEME_BEKLIYOR'),
      inProcess: sum(group => group.status === 'ODEMEYE_ALINDI'),
      paid: sum(group => group.status === 'ODENDI'),
      writer: sum(group => group.status !== 'IPTAL' && group.roleCode === 'YAZAR'),
      editor: sum(group => group.status !== 'IPTAL' && group.roleCode === 'EDITOR'),
      coordinator: sum(group => group.status !== 'IPTAL' && group.roleCode.endsWith('KOORDINATORU') || group.status !== 'IPTAL' && group.roleCode === 'GENEL_KOORDINATOR')
    };
    return { entries: entries.slice(0, limit).map(entryDto), nextCursor: entries.length > limit ? entries[limit - 1].id : null, summary };
  }, { isolationLevel: 'RepeatableRead' });
  return res.status(200).json(result);
}

async function listRules(req: VercelRequest, res: VercelResponse) {
  const includeHistory = req.query.history === '1' || req.query.history === 'true';
  const rules = await prisma.compensationRule.findMany({
    where: includeHistory ? undefined : { isActive: true },
    select: ruleSelect,
    orderBy: [{ isActive: 'desc' }, { validFrom: 'desc' }, { id: 'desc' }],
    take: includeHistory ? 200 : 50
  });
  return res.status(200).json({ rules: rules.map(ruleDto) });
}

async function createRule(req: VercelRequest, res: VercelResponse, user: any) {
  if (!canManageRules(user)) return res.status(403).json({ error: 'Only the general coordinator can set compensation rates' });

  const roleCode = typeof req.body?.roleCode === 'string' ? req.body.roleCode : '';
  if (!(roleCode in roleRuleMap)) return res.status(400).json({ error: 'Invalid compensation role' });

  const unitPrice = parseMoney(req.body?.unitPrice);
  if (!unitPrice) return res.status(400).json({ error: 'Invalid unit price' });

  const rawProjectId = req.body?.projectId;
  const projectId = rawProjectId == null || rawProjectId === '' ? null : positiveInt(rawProjectId);
  if (rawProjectId != null && rawProjectId !== '' && !projectId) {
    return res.status(400).json({ error: 'Invalid project id' });
  }

  let project: { id: number; title: string; code: string; status: string } | null = null;
  if (projectId) {
    project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, title: true, code: true, status: true }
    });
    if (!project || project.status === 'Arsiv') {
      return res.status(404).json({ error: 'Project not found or archived' });
    }
  }

  const mapping = roleRuleMap[roleCode as CompensationRole];
  const now = new Date();

  const created = await prisma.$transaction(async (tx: any) => {
    const previous = await tx.compensationRule.findFirst({
      where: {
        roleCode,
        earningType: mapping.earningType,
        projectId,
        isActive: true
      },
      orderBy: [{ validFrom: 'desc' }, { id: 'desc' }],
      select: { id: true, unitPrice: true }
    });

    if (previous) {
      await tx.compensationRule.update({
        where: { id: previous.id },
        data: { isActive: false, validTo: now }
      });
    }

    const rule = await tx.compensationRule.create({
      data: {
        roleCode,
        earningType: mapping.earningType,
        unitType: mapping.unitType,
        unitPrice,
        projectId,
        validFrom: now,
        createdByUserId: user.id
      },
      select: ruleSelect
    });

    await tx.activityLog.create({
      data: {
        userName: user.fullName,
        action: previous ? 'COMPENSATION_RULE_REPLACED' : 'COMPENSATION_RULE_CREATED',
        entityType: 'CompensationRule',
        entityId: rule.id,
        details: JSON.stringify({
          roleCode,
          earningType: mapping.earningType,
          unitType: mapping.unitType,
          projectId,
          projectCode: project?.code ?? null,
          previousRuleId: previous?.id ?? null,
          previousUnitPrice: previous?.unitPrice?.toFixed?.(2) ?? null,
          unitPrice
        })
      }
    });

    return rule;
  });

  return res.status(201).json({ rule: ruleDto(created) });
}

async function deactivateRule(
  id: number,
  req: VercelRequest,
  res: VercelResponse,
  user: any
) {
  if (!canManageRules(user)) return res.status(403).json({ error: 'Only the general coordinator can change compensation rates' });
  if (req.body?.action !== 'deactivate') return res.status(400).json({ error: 'Invalid compensation rule action' });

  const current = await prisma.compensationRule.findUnique({ where: { id }, select: ruleSelect });
  if (!current) return res.status(404).json({ error: 'Compensation rule not found' });
  if (!current.isActive) return res.status(409).json({ error: 'Compensation rule is already inactive' });

  const now = new Date();
  const updated = await prisma.$transaction(async (tx: any) => {
    const rule = await tx.compensationRule.update({
      where: { id },
      data: { isActive: false, validTo: now },
      select: ruleSelect
    });

    await tx.activityLog.create({
      data: {
        userName: user.fullName,
        action: 'COMPENSATION_RULE_DEACTIVATED',
        entityType: 'CompensationRule',
        entityId: id,
        details: JSON.stringify({
          roleCode: current.roleCode,
          earningType: current.earningType,
          projectId: current.projectId,
          unitPrice: current.unitPrice.toFixed(2)
        })
      }
    });

    return rule;
  });

  return res.status(200).json({ rule: ruleDto(updated) });
}

