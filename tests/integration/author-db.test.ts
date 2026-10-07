import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '../../generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import collectionHandler from '../../api/v1/authors/index';
import detailHandler from '../../api/v1/authors/[id]';
import loginHandler from '../../api/v1/auth/login';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('DB integration NOT RUN: DATABASE_URL is required');
  describe.skip('DB Integration', () => {
    it('skipped', () => {});
  });
} else if (process.env.PROLIG_PILOT_DB_CONFIRMED !== 'true') {
  console.warn('DB integration NOT RUN: PROLIG_PILOT_DB_CONFIRMED=true is required');
  describe.skip('DB Integration', () => {
    it('skipped', () => {});
  });
} else {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  async function getCookie(email: string, passKey: string) {
    const fs = require('fs');
    const envContent = fs.readFileSync('.local/prolig-pilot-credentials.env', 'utf8');
    const pass = envContent.match(new RegExp(`${passKey}=(.*)`))?.[1];

    let headers: any = {};
    const req: any = { method: 'POST', body: { email, password: pass } };
    const res: any = {
      setHeader(k: string, v: string) { headers[k] = v; },
      status() { return this; },
      json() {}
    };
    await loginHandler(req, res);
    const cookieStr = headers['Set-Cookie'];
    return Array.isArray(cookieStr) ? cookieStr[0] : cookieStr;
  }

  describe('Author DB Integration', () => {
    let yazarCookie: string;
    let genelCookie: string;
    
    beforeAll(async () => {
      yazarCookie = await getCookie('pilot.yazar@prolig.local', 'PILOT_YAZAR_PASSWORD');
      genelCookie = await getCookie('pilot.genel@prolig.local', 'PILOT_GENEL_KOORDINATOR_PASSWORD');
    });

    afterAll(async () => {
      await prisma.$disconnect();
      await pool.end();
    });

    it('YAZAR getting own profile and missing others', async () => {
      let statusCode = 200;
      let jsonData: any = null;
      let req: any = { method: 'GET', headers: { cookie: yazarCookie } };
      let res: any = {
        setHeader() {},
        status(code: number) { statusCode = code; return this; },
        json(data: any) { jsonData = data; }
      };

      await collectionHandler(req, res);
      expect(statusCode).toBe(200);
      expect(jsonData.length).toBe(1);
      expect(jsonData[0].fullName).toBeDefined();

      const myId = jsonData[0].id;
      
      // Get detail
      req = { method: 'GET', query: { id: String(myId) }, headers: { cookie: yazarCookie } };
      statusCode = 200;
      res = {
        setHeader() {},
        status(code: number) { statusCode = code; return this; },
        json(data: any) { jsonData = data; }
      };
      
      await detailHandler(req, res);
      expect(statusCode).toBe(200);
      expect(jsonData.id).toBe(myId);
      expect(jsonData.branch.name).toBe('Matematik');
      expect(jsonData.province.name).toBe('İstanbul');
      expect(jsonData.province.region).toBe('Marmara');
      expect(jsonData.activeProjectCount).toBeGreaterThanOrEqual(1);
      expect(jsonData.projectGrades).toContain('8. Sınıf');
      expect(jsonData.passwordHash).toBeUndefined();

      // Try missing
      req = { method: 'GET', query: { id: '9999' }, headers: { cookie: yazarCookie } };
      statusCode = 200;
      await detailHandler(req, res);
      expect(statusCode).toBe(404);
    });

    it('GENEL gets all authors', async () => {
      let statusCode = 200;
      let jsonData: any = null;
      const req: any = { method: 'GET', headers: { cookie: genelCookie } };
      const res: any = {
        setHeader() {},
        status(code: number) { statusCode = code; return this; },
        json(data: any) { jsonData = data; }
      };

      await collectionHandler(req, res);
      expect(statusCode).toBe(200);
      expect(jsonData.length).toBeGreaterThanOrEqual(1);
    });
  });
}
