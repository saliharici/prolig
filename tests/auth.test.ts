import { describe, it, expect, beforeEach } from 'vitest';
import { getSecret, setSessionCookie, clearSessionCookie, getSessionUserId } from '../api/v1/_lib/auth';
import { VercelResponse, VercelRequest } from '@vercel/node';
import jwt from 'jsonwebtoken';

describe('Auth Utilities', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-secret-123';
  });

  it('fails closed when AUTH_SECRET is missing', () => {
    delete process.env.AUTH_SECRET;
    expect(() => getSecret()).toThrowError('AUTH_SECRET is not configured.');
  });

  it('returns secret when configured', () => {
    expect(getSecret()).toBe('test-secret-123');
  });

  it('sets a session cookie correctly', () => {
    const headers: Record<string, string> = {};
    const res = {
      setHeader: (name: string, value: string) => {
        headers[name] = value;
      }
    } as unknown as VercelResponse;

    setSessionCookie(res, 999);
    
    expect(headers['Set-Cookie']).toBeDefined();
    expect(headers['Set-Cookie']).toContain('prolig_session=');
    expect(headers['Set-Cookie']).toContain('HttpOnly');
    expect(headers['Set-Cookie']).toContain('SameSite=Strict');
  });

  it('clears a session cookie correctly', () => {
    const headers: Record<string, string> = {};
    const res = {
      setHeader: (name: string, value: string) => {
        headers[name] = value;
      }
    } as unknown as VercelResponse;

    clearSessionCookie(res);
    
    expect(headers['Set-Cookie']).toBeDefined();
    expect(headers['Set-Cookie']).toContain('prolig_session=;');
    expect(headers['Set-Cookie']).toContain('Max-Age=0');
  });

  it('extracts session user id correctly', () => {
    const headers: Record<string, string> = {};
    const res = {
      setHeader: (name: string, value: string) => {
        headers[name] = value;
      }
    } as unknown as VercelResponse;

    setSessionCookie(res, 42);
    
    // Simulate Request
    const req = {
      headers: {
        cookie: headers['Set-Cookie']
      }
    } as unknown as VercelRequest;

    const userId = getSessionUserId(req);
    expect(userId).toBe(42);
  });

  it('rejects tampered session', () => {
    const req = {
      headers: {
        cookie: 'prolig_session=invalid.token.here'
      }
    } as unknown as VercelRequest;

    const userId = getSessionUserId(req);
    expect(userId).toBeNull();
  });

  describe('Strict subject validation', () => {
    const createReq = (sub: any): VercelRequest => {
      const secret = getSecret();
      let payload = {};
      if (sub !== undefined) {
        payload = { sub };
      }
      const token = jwt.sign(payload, secret, { algorithm: 'HS256' });
      return {
        headers: {
          cookie: `prolig_session=${token}`
        }
      } as unknown as VercelRequest;
    };

    it('accepts valid string subject', () => {
      expect(getSessionUserId(createReq('42'))).toBe(42);
    });

    it('accepts valid number subject', () => {
      expect(getSessionUserId(createReq(42))).toBe(42);
    });

    it('rejects zero subject', () => {
      expect(getSessionUserId(createReq('0'))).toBeNull();
      expect(getSessionUserId(createReq(0))).toBeNull();
    });

    it('rejects negative subject', () => {
      expect(getSessionUserId(createReq('-1'))).toBeNull();
      expect(getSessionUserId(createReq(-1))).toBeNull();
    });

    it('rejects numeric-prefix garbage', () => {
      expect(getSessionUserId(createReq('12abc'))).toBeNull();
    });

    it('rejects fractional value', () => {
      expect(getSessionUserId(createReq('1.5'))).toBeNull();
      expect(getSessionUserId(createReq(1.5))).toBeNull();
    });

    it('rejects missing subject', () => {
      expect(getSessionUserId(createReq(undefined))).toBeNull();
    });
    
    it('rejects boolean subject', () => {
      expect(getSessionUserId(createReq(true))).toBeNull();
    });

    it('rejects empty string', () => {
      expect(getSessionUserId(createReq(''))).toBeNull();
    });
  });
});
