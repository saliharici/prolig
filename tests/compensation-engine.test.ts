import { describe, expect, it, vi } from 'vitest';
import {
  accrueProjectCoordinatorCompletion,
  accrueQuestionApproval
} from '../api/v1/_lib/compensation-engine.js';

function decimal(value: string) {
  return { toFixed: () => value };
}

function buildTx(options: {
  projectRule?: any;
  defaultRules?: Record<string, any>;
  existingSources?: Set<string>;
  coordinator?: any;
} = {}) {
  const entries: any[] = [];
  const logs: any[] = [];
  const existingSources = options.existingSources ?? new Set<string>();
  const defaultRules = options.defaultRules ?? {};

  const tx: any = {
    compensationRule: {
      findFirst: vi.fn(async ({ where }: any) => {
        if (where.projectId && options.projectRule && where.earningType === options.projectRule.earningType) {
          return options.projectRule;
        }
        return defaultRules[where.earningType] ?? null;
      })
    },
    compensationEntry: {
      findUnique: vi.fn(async ({ where }: any) => existingSources.has(where.sourceKey) ? { id: 999, sourceKey: where.sourceKey } : null),
      create: vi.fn(async ({ data }: any) => {
        const entry = { id: entries.length + 1, ...data };
        entries.push(entry);
        existingSources.add(data.sourceKey);
        return entry;
      })
    },
    user: {
      findUnique: vi.fn(async () => options.coordinator ?? null)
    },
    activityLog: {
      create: vi.fn(async ({ data }: any) => {
        logs.push(data);
        return { id: logs.length, ...data };
      })
    }
  };

  return { tx, entries, logs };
}

describe('compensation calculation engine', () => {
  it('creates separate writer and editor earning snapshots on approval', async () => {
    const { tx, entries } = buildTx({
      defaultRules: {
        QUESTION_AUTHOR: { id: 1, unitPrice: decimal('100.00') },
        QUESTION_EDITOR: { id: 2, unitPrice: decimal('25.00') }
      }
    });

    await accrueQuestionApproval(
      tx,
      { id: 41, authorUserId: 7, projectId: 3 },
      { id: 9, role: { code: 'EDITOR' } },
      new Date('2026-10-10T18:00:00.000Z')
    );

    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual(expect.objectContaining({
      userId: 7,
      roleCode: 'YAZAR',
      earningType: 'QUESTION_AUTHOR',
      sourceKey: 'QUESTION_AUTHOR:41',
      ruleId: 1,
      amount: expect.anything()
    }));
    expect(entries[1]).toEqual(expect.objectContaining({
      userId: 9,
      roleCode: 'EDITOR',
      earningType: 'QUESTION_EDITOR',
      sourceKey: 'QUESTION_EDITOR:41',
      ruleId: 2
    }));
    expect(entries[0].unitPrice.toFixed()).toBe('100.00');
    expect(entries[1].unitPrice.toFixed()).toBe('25.00');
  });

  it('prefers a project-specific tariff over the general tariff', async () => {
    const { tx, entries } = buildTx({
      projectRule: { id: 8, earningType: 'QUESTION_AUTHOR', unitPrice: decimal('125.00') },
      defaultRules: {
        QUESTION_AUTHOR: { id: 1, unitPrice: decimal('100.00') }
      }
    });

    await accrueQuestionApproval(
      tx,
      { id: 42, authorUserId: 7, projectId: 3 },
      { id: 1, role: { code: 'GENEL_KOORDINATOR' } }
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].ruleId).toBe(8);
    expect(entries[0].unitPrice.toFixed()).toBe('125.00');
  });

  it('does not create an editor fee when general coordinator approves a question', async () => {
    const { tx, entries } = buildTx({
      defaultRules: {
        QUESTION_AUTHOR: { id: 1, unitPrice: decimal('100.00') },
        QUESTION_EDITOR: { id: 2, unitPrice: decimal('25.00') }
      }
    });

    await accrueQuestionApproval(
      tx,
      { id: 43, authorUserId: 7, projectId: null },
      { id: 1, role: { code: 'GENEL_KOORDINATOR' } }
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].roleCode).toBe('YAZAR');
  });

  it('is idempotent by sourceKey', async () => {
    const { tx, entries } = buildTx({
      defaultRules: { QUESTION_AUTHOR: { id: 1, unitPrice: decimal('100.00') } },
      existingSources: new Set(['QUESTION_AUTHOR:44'])
    });

    await accrueQuestionApproval(
      tx,
      { id: 44, authorUserId: 7, projectId: 2 },
      { id: 1, role: { code: 'GENEL_KOORDINATOR' } }
    );

    expect(entries).toHaveLength(0);
  });

  it('records a missing-rate audit instead of inventing a fee', async () => {
    const { tx, entries, logs } = buildTx();

    await accrueQuestionApproval(
      tx,
      { id: 45, authorUserId: 7, projectId: 2 },
      { id: 1, role: { code: 'GENEL_KOORDINATOR' } }
    );

    expect(entries).toHaveLength(0);
    expect(logs).toContainEqual(expect.objectContaining({
      action: 'COMPENSATION_RATE_MISSING',
      entityType: 'Question',
      entityId: 45
    }));
  });

  it('creates the assigned coordinator project fee according to coordinator role', async () => {
    const { tx, entries } = buildTx({
      coordinator: { id: 12, role: { code: 'IL_KOORDINATORU' } },
      defaultRules: {
        PROJECT_PROVINCE_COORDINATOR: { id: 5, unitPrice: decimal('2500.00') }
      }
    });

    await accrueProjectCoordinatorCompletion(
      tx,
      { id: 77, coordinatorId: 12 },
      new Date('2026-10-10T18:30:00.000Z')
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual(expect.objectContaining({
      userId: 12,
      roleCode: 'IL_KOORDINATORU',
      earningType: 'PROJECT_PROVINCE_COORDINATOR',
      projectId: 77,
      sourceKey: 'PROJECT_COORDINATOR:77:12:PROJECT_PROVINCE_COORDINATOR',
      ruleId: 5
    }));
    expect(entries[0].unitPrice.toFixed()).toBe('2500.00');
  });
});
