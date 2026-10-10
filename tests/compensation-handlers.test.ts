import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCompensationAction } from '../api/v1/_lib/compensation-handler.js';
import { prisma } from '../api/v1/_lib/prisma.js';

vi.mock('../api/v1/_lib/prisma.js', () => ({
  prisma: {
    compensationRule: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn()
    },
    compensationEntry: {
      count: vi.fn()
    },
    project: {
      findUnique: vi.fn()
    },
    activityLog: {
      create: vi.fn()
    },
    $transaction: vi.fn(async (cb) => cb(prisma))
  }
}));

function reqRes(method: string, query: any = {}, body: any = {}) {
  const req = { method, query, body } as VercelRequest;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    setHeader: vi.fn()
  } as unknown as VercelResponse;
  return { req, res };
}

const general = { id: 1, fullName: 'Genel Koordinatör', role: { code: 'GENEL_KOORDINATOR' } };
const accounting = { id: 2, fullName: 'Muhasebe', role: { code: 'MUHASEBE' } };
const writer = { id: 3, fullName: 'Yazar', role: { code: 'YAZAR' } };

const mockRule = (overrides: any = {}) => ({
  id: 10,
  roleCode: 'YAZAR',
  earningType: 'QUESTION_AUTHOR',
  unitType: 'QUESTION',
  unitPrice: { toFixed: () => '100.00' },
  projectId: null,
  project: null,
  validFrom: new Date('2026-10-10T17:00:00.000Z'),
  validTo: null,
  isActive: true,
  createdAt: new Date('2026-10-10T17:00:00.000Z'),
  updatedAt: new Date('2026-10-10T17:00:00.000Z'),
  createdByUser: { id: 1, fullName: 'Genel Koordinatör' },
  ...overrides
});

describe('Compensation tariff handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows accounting to read tariffs but not change them', async () => {
    vi.mocked(prisma.compensationRule.findMany).mockResolvedValue([]);
    const list = reqRes('GET');
    await handleCompensationAction(list.req, list.res, accounting, 'compensationRules');
    expect(list.res.status).toHaveBeenCalledWith(200);

    const create = reqRes('POST', {}, { roleCode: 'YAZAR', unitPrice: '100.00', projectId: null });
    await handleCompensationAction(create.req, create.res, accounting, 'compensationRules');
    expect(create.res.status).toHaveBeenCalledWith(403);
  });

  it('rejects tariff access for non-finance roles', async () => {
    const { req, res } = reqRes('GET');
    await handleCompensationAction(req, res, writer, 'compensationRules');
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('lets only the general coordinator create a writer question tariff', async () => {
    vi.mocked(prisma.compensationRule.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.compensationRule.create).mockResolvedValue(mockRule() as any);

    const { req, res } = reqRes('POST', {}, {
      roleCode: 'YAZAR',
      unitPrice: '100,00',
      projectId: null
    });
    await handleCompensationAction(req, res, general, 'compensationRules');

    expect(prisma.compensationRule.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        roleCode: 'YAZAR',
        earningType: 'QUESTION_AUTHOR',
        unitType: 'QUESTION',
        unitPrice: '100.00',
        projectId: null,
        createdByUserId: 1
      })
    }));
    expect(prisma.activityLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'COMPENSATION_RULE_CREATED' })
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('versions a tariff instead of mutating its historical price', async () => {
    vi.mocked(prisma.compensationRule.findFirst).mockResolvedValue({
      id: 5,
      unitPrice: { toFixed: () => '80.00' }
    } as any);
    vi.mocked(prisma.compensationRule.create).mockResolvedValue(mockRule({ id: 11, unitPrice: { toFixed: () => '120.00' } }) as any);

    const { req, res } = reqRes('POST', {}, {
      roleCode: 'YAZAR',
      unitPrice: '120.00',
      projectId: null
    });
    await handleCompensationAction(req, res, general, 'compensationRules');

    expect(prisma.compensationRule.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 5 },
      data: expect.objectContaining({ isActive: false, validTo: expect.any(Date) })
    }));
    expect(prisma.compensationRule.create).toHaveBeenCalled();
    expect(prisma.activityLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'COMPENSATION_RULE_REPLACED' })
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('supports project-specific overrides only for real non-archived projects', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: 7,
      title: 'Pilot Proje',
      code: 'PILOT-7',
      status: 'Devam_Ediyor'
    } as any);
    vi.mocked(prisma.compensationRule.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.compensationRule.create).mockResolvedValue(mockRule({
      projectId: 7,
      project: { id: 7, title: 'Pilot Proje', code: 'PILOT-7', status: 'Devam_Ediyor' }
    }) as any);

    const { req, res } = reqRes('POST', {}, {
      roleCode: 'EDITOR',
      unitPrice: '25.00',
      projectId: 7
    });
    await handleCompensationAction(req, res, general, 'compensationRules');

    expect(prisma.project.findUnique).toHaveBeenCalled();
    expect(prisma.compensationRule.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        projectId: 7,
        roleCode: 'EDITOR',
        earningType: 'QUESTION_EDITOR'
      })
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('rejects malformed or zero money values', async () => {
    for (const unitPrice of ['0', '-1', '1.234', 'abc']) {
      const { req, res } = reqRes('POST', {}, { roleCode: 'YAZAR', unitPrice, projectId: null });
      await handleCompensationAction(req, res, general, 'compensationRules');
      expect(res.status).toHaveBeenCalledWith(400);
    }
  });

  it('deactivates a tariff without deleting it', async () => {
    vi.mocked(prisma.compensationRule.findUnique).mockResolvedValue(mockRule() as any);
    vi.mocked(prisma.compensationRule.update).mockResolvedValue(mockRule({
      isActive: false,
      validTo: new Date('2026-10-10T18:00:00.000Z')
    }) as any);

    const { req, res } = reqRes('PATCH', { id: '10' }, { action: 'deactivate' });
    await handleCompensationAction(req, res, general, 'compensationRule');

    expect(prisma.compensationRule.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 10 },
      data: expect.objectContaining({ isActive: false })
    }));
    expect(prisma.activityLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'COMPENSATION_RULE_DEACTIVATED' })
    }));
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('Compensation foundation contracts', () => {
  it('stores rule versions and immutable earning snapshots in Prisma', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const schema = fs.readFileSync(path.resolve(__dirname, '../prisma/schema.prisma'), 'utf8');
    const migration = fs.readFileSync(path.resolve(__dirname, '../prisma/migrations/20261010190000_compensation_engine_foundation/migration.sql'), 'utf8');

    expect(schema).toContain('model CompensationRule');
    expect(schema).toContain('model CompensationEntry');
    expect(schema).toContain('sourceKey   String                  @unique');
    expect(schema).toContain('unitPrice   Decimal');
    expect(schema).toContain('amount      Decimal');
    expect(migration).toContain('CREATE TABLE "CompensationRule"');
    expect(migration).toContain('CREATE TABLE "CompensationEntry"');
  });

  it('uses the existing management serverless function', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const vercel = fs.readFileSync(path.resolve(__dirname, '../vercel.json'), 'utf8');

    expect(vercel).toContain('"/api/v1/compensation/rules"');
    expect(vercel).toContain('"/api/v1/management?action=compensationRules"');
    expect(vercel).not.toContain('"/api/v1/compensation.ts"');
  });
});
