const fs = require('fs');
const testsContent = `import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateRole, fetchMe, login, logout } from '../src/auth/api';

// Mock fetch globally
global.fetch = vi.fn();

describe('Frontend Auth Logic', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('validateRole', () => {
    it('accepts six canonical roles', () => {
      expect(validateRole('GENEL_KOORDINATOR')).toBe('GENEL_KOORDINATOR');
      expect(validateRole('BOLGE_KOORDINATORU')).toBe('BOLGE_KOORDINATORU');
      expect(validateRole('IL_KOORDINATORU')).toBe('IL_KOORDINATORU');
      expect(validateRole('EDITOR')).toBe('EDITOR');
      expect(validateRole('YAZAR')).toBe('YAZAR');
      expect(validateRole('MUHASEBE')).toBe('MUHASEBE');
    });

    it('rejects YONETICI and SUPER_ADMIN', () => {
      expect(validateRole('YONETICI')).toBeNull();
      expect(validateRole('SUPER_ADMIN')).toBeNull();
    });

    it('rejects unknown/invalid roles', () => {
      expect(validateRole('ADMIN')).toBeNull();
      expect(validateRole(null)).toBeNull();
      expect(validateRole(undefined)).toBeNull();
      expect(validateRole(123)).toBeNull();
    });
  });

  describe('fetchMe', () => {
    it('returns valid AuthUser on 200', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          user: {
            id: 1,
            email: 'test@prolig.local',
            fullName: 'Test User',
            role: 'EDITOR',
            provinceId: null,
            assignedRegion: null
          }
        })
      } as Response);

      const user = await fetchMe();
      expect(user).toEqual({
        id: 1,
        email: 'test@prolig.local',
        fullName: 'Test User',
        role: 'EDITOR',
        provinceId: null,
        assignedRegion: null
      });
    });

    it('returns null on 401', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401
      } as Response);

      const user = await fetchMe();
      expect(user).toBeNull();
    });

    it('throws error on 500', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response);

      await expect(fetchMe()).rejects.toThrow('Sunucu hatası');
    });

    it('fails closed on malformed id', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ user: { id: -1, email: 'test@a', fullName: 'A', role: 'EDITOR' } })
      } as Response);
      await expect(fetchMe()).rejects.toThrow('Geçersiz kullanıcı ID');
    });

    it('fails closed on missing email', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ user: { id: 1, email: '', fullName: 'A', role: 'EDITOR' } })
      } as Response);
      await expect(fetchMe()).rejects.toThrow('Geçersiz e-posta');
    });
    
    it('fails closed on unknown role', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ user: { id: 1, email: 'a@a', fullName: 'A', role: 'YONETICI' } })
      } as Response);
      await expect(fetchMe()).rejects.toThrow('Geçersiz veya yetkisiz rol');
    });
  });

  describe('login', () => {
    it('calls login endpoint correctly', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200 } as Response);
      await login('test@prolig.local', 'password');
      expect(fetch).toHaveBeenCalledWith('/api/v1/auth/login', expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ email: 'test@prolig.local', password: 'password' })
      }));
    });
    
    it('throws custom error on 401', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 401 } as Response);
      await expect(login('a', 'b')).rejects.toThrow('E-posta veya şifre hatalı.');
    });
  });

  describe('logout', () => {
    it('calls logout endpoint correctly', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200 } as Response);
      await logout();
      expect(fetch).toHaveBeenCalledWith('/api/v1/auth/logout', expect.objectContaining({
        method: 'POST',
        credentials: 'include'
      }));
    });

    it('throws error if logout fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500 } as Response);
      await expect(logout()).rejects.toThrow('Çıkış yapılamadı');
    });
  });
});
`;
fs.writeFileSync('tests/frontend-auth.test.ts', testsContent, 'utf8');
