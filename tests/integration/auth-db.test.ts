import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '../../generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import loginHandler from '../../api/v1/auth/login';
import meHandler from '../../api/v1/auth/me';
import logoutHandler from '../../api/v1/auth/logout';
import * as bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;

// Require safety gate
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

  describe('Authentication DB Integration', () => {
    
    beforeAll(async () => {
      const role = await prisma.role.findUnique({ where: { code: 'YAZAR' } });
      if (!role) {
        throw new Error('Integration setup failed: Canonical role YAZAR not found.');
      }

      const validHash = await bcrypt.hash('dummy-inactive-pass', 10);
      
      await prisma.user.upsert({
        where: { email: 'integration.inactive@prolig.local' },
        update: { status: 'Pasif', passwordHash: validHash },
        create: {
          email: 'integration.inactive@prolig.local',
          username: 'integration.inactive',
          passwordHash: validHash,
          fullName: 'Integration Inactive',
          roleId: role.id,
          status: 'Pasif'
        }
      });
    });

    afterAll(async () => {
      let cleanupError: Error | null = null;
      try {
        await prisma.user.delete({ where: { email: 'integration.inactive@prolig.local' } });
        const check = await prisma.user.findUnique({ where: { email: 'integration.inactive@prolig.local' } });
        if (check) {
          cleanupError = new Error('Integration cleanup failed: temporary user was not successfully removed from the database.');
        }
      } catch (e: any) {
        cleanupError = e;
      } finally {
        await prisma.$disconnect();
        await pool.end();
      }

      if (cleanupError) {
        throw cleanupError;
      }
    });

    it('Valid login returns 200 and HttpOnly cookie', async () => {
      const fs = require('fs');
      const envContent = fs.readFileSync('.local/prolig-pilot-credentials.env', 'utf8');
      const yazarPass = envContent.match(/PILOT_YAZAR_PASSWORD=(.*)/)?.[1];

      let statusCode = 200;
      let jsonData: any = null;
      let headers: any = {};
      
      const req: any = {
        method: 'POST',
        body: { email: 'pilot.yazar@prolig.local', password: yazarPass }
      };
      
      const res: any = {
        setHeader(key: string, val: string) { headers[key] = val; },
        status(code: number) { statusCode = code; return this; },
        json(data: any) { jsonData = data; }
      };

      await loginHandler(req, res);

      expect(statusCode).toBe(200);
      expect(jsonData.user).toBeDefined();
      expect(jsonData.user.role).toBe('YAZAR');
      
      const setCookie = headers['Set-Cookie'];
      expect(setCookie).toBeDefined();
      expect(setCookie).toContain('prolig_session=');
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('SameSite=Strict');
      expect(JSON.stringify(jsonData)).not.toContain('prolig_session'); // not in body
    });

    it('meHandler returns correct DB user data', async () => {
      const fs = require('fs');
      const envContent = fs.readFileSync('.local/prolig-pilot-credentials.env', 'utf8');
      const yazarPass = envContent.match(/PILOT_YAZAR_PASSWORD=(.*)/)?.[1];

      let req: any = { method: 'POST', body: { email: 'pilot.yazar@prolig.local', password: yazarPass } };
      let headers: any = {};
      let res: any = {
        setHeader(k: string, v: string) { headers[k] = v; },
        status() { return this; }, json() {}
      };
      await loginHandler(req, res);

      const cookieStr = headers['Set-Cookie'];
      const actualCookie = Array.isArray(cookieStr) ? cookieStr[0] : cookieStr;

      let meReq: any = {
        method: 'GET',
        headers: {
          cookie: actualCookie
        }
      };
      let meStatusCode = 200;
      let meJson: any = null;
      let meHeaders: any = {};
      let meRes: any = {
        setHeader(k: string, v: string) { meHeaders[k] = v; },
        status(code: number) { meStatusCode = code; return this; },
        json(data: any) { meJson = data; }
      };

      await meHandler(meReq, meRes);
      expect(meStatusCode).toBe(200);
      expect(meJson.user.email).toBe('pilot.yazar@prolig.local');
      expect(meJson.user.passwordHash).toBeUndefined(); // no passwordHash exposed
    });

    it('Logout clears the cookie', async () => {
      let headers: any = {};
      const req: any = { method: 'POST' };
      const res: any = {
        setHeader(k: string, v: string) { headers[k] = v; },
        status(code: number) { return this; },
        json(data: any) {}
      };

      await logoutHandler(req, res);
      expect(headers['Set-Cookie']).toContain('Max-Age=0');
      expect(headers['Set-Cookie']).toContain('prolig_session=;');
    });

    it('Invalid password returns 401', async () => {
      let statusCode = 200;
      let jsonData: any = null;
      const req: any = {
        method: 'POST',
        body: { email: 'pilot.yazar@prolig.local', password: 'wrong' }
      };
      const res: any = {
        setHeader() {},
        status(code: number) { statusCode = code; return this; },
        json(data: any) { jsonData = data; }
      };

      await loginHandler(req, res);
      expect(statusCode).toBe(401);
      expect(jsonData.error).toBe('Invalid credentials');
    });

    it('Inactive user is rejected even with valid password', async () => {
      let statusCode = 200;
      let jsonData: any = null;
      const req: any = {
        method: 'POST',
        body: { email: 'integration.inactive@prolig.local', password: 'dummy-inactive-pass' }
      };
      const res: any = {
        setHeader() {},
        status(code: number) { statusCode = code; return this; },
        json(data: any) { jsonData = data; }
      };

      await loginHandler(req, res);
      expect(statusCode).toBe(401);
      expect(jsonData.error).toBe('Invalid credentials');
    });

    it('Tampered session is rejected', async () => {
      let req: any = {
        method: 'GET',
        headers: { cookie: 'prolig_session=tampered.token.here' }
      };
      let statusCode = 200;
      let res: any = {
        setHeader() {},
        status(code: number) { statusCode = code; return this; },
        json() {}
      };

      await meHandler(req, res);
      expect(statusCode).toBe(401);
    });

  });
}
