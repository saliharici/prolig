import { describe, it, expect, beforeEach } from 'vitest';
import { getSecret, setSessionCookie, clearSessionCookie, getSessionUserId } from '../api/v1/_lib/auth';
import { VercelResponse, VercelRequest } from '@vercel/node';

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
});
