import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { prisma } from '../../api/v1/_lib/prisma.js';
import projectCollection from '../../api/v1/projects/index.js';

const projectCode = 'PILOT-MAT-8-001';

describe('Project DB integration', () => {
  const users: Record<string, any> = {};
  let projectId = 0;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL || !process.env.AUTH_SECRET || process.env.PROLIG_PILOT_DB_CONFIRMED !== 'true') {
      throw new Error('Safety gate failed. DATABASE_URL, AUTH_SECRET, PROLIG_PILOT_DB_CONFIRMED required.');
    }

    const canonical = await prisma.project.findUnique({ where: { code: projectCode } });
    if (!canonical) throw new Error('Canonical Pilot Project is missing. Run the guarded Pilot seed first.');
    projectId = canonical.id;

    for (const role of ['genel', 'bolge', 'il', 'editor', 'yazar', 'muhasebe']) {
      users[role] = await prisma.user.findUnique({ where: { email: `pilot.${role}@prolig.local` } });
      if (!users[role]) throw new Error(`Canonical Pilot ${role} user is missing.`);
    }
  });

  afterAll(async () => prisma.$disconnect());

  const requestFor = (user: any): any => {
    const token = jwt.sign({ sub: String(user.id) }, process.env.AUTH_SECRET!, { expiresIn: '7d', algorithm: 'HS256' });
    return { method: 'GET', headers: { cookie: serialize('prolig_session', token) }, query: {} };
  };

  const response = (): any => {
    const res: any = { statusCode: 200, data: null };
    res.status = (code: number) => { res.statusCode = code; return res; };
    res.json = (data: any) => { res.data = data; return res; };
    res.setHeader = () => res;
    return res;
  };

  it('has exactly one canonical project and one YAZAR assignment', async () => {
    expect(await prisma.project.count({ where: { code: projectCode } })).toBe(1);
    const yazar = await prisma.user.findUnique({ where: { email: 'pilot.yazar@prolig.local' }, include: { AuthorProfile: true } });
    expect(yazar?.AuthorProfile).toBeTruthy();
    expect(await prisma.projectAuthor.count({ where: { projectId, authorProfileId: yazar!.AuthorProfile!.id } })).toBe(1);
  });

  it.each(['genel', 'yazar', 'editor', 'bolge', 'il', 'muhasebe'])('%s sees the canonical scoped project', async role => {
    const res = response();
    await projectCollection(requestFor(users[role]), res);
    expect(res.statusCode).toBe(200);
    expect(res.data.filter((project: any) => project.code === projectCode)).toHaveLength(1);
  });
});
