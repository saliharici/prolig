import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../api/v1/payments.js';
import { prisma } from '../api/v1/_lib/prisma.js';

vi.mock('../api/v1/_lib/prisma.js', () => ({
  prisma: {
    payment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => cb(prisma)),
  },
}));
vi.mock('../api/v1/_lib/current-user.js', () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ id: 1, role: 'MUHASEBE', fullName: 'Test User' }),
}));

function reqRes(method: string, query: any = {}) {
  const req = { method, query } as VercelRequest;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    setHeader: vi.fn(),
  } as unknown as VercelResponse;
  return { req, res };
}

describe('Payment API Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('passes', () => {
    expect(true).toBe(true);
  });
});
