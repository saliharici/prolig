import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchAuthors, AuthorApiError } from '../src/authors/api';
import fs from 'fs';
import path from 'path';

const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('Author API Frontend Client', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchAuthors uses correct path and credentials', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 1, fullName: 'Test Yazar' }]
    });

    const result = await fetchAuthors();
    expect(result).toEqual([{ id: 1, fullName: 'Test Yazar' }]);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/authors', expect.objectContaining({
      credentials: 'include'
    }));
  });

  describe('Error Mapping', () => {
    const runErrorTest = async (status: number, expectedMessage: string) => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status,
        json: async () => ({})
      });
      await expect(fetchAuthors()).rejects.toThrowError(new AuthorApiError(status, expectedMessage));
    };

    it('maps 401', () => runErrorTest(401, 'Oturum süresi dolmuş veya yetkisiz.'));
    it('maps 403', () => runErrorTest(403, 'Yazar ağını görüntüleme yetkiniz yok.'));
    it('maps 500', () => runErrorTest(500, 'Yazar ağı yüklenemedi. Lütfen daha sonra tekrar deneyin.'));
  });

  describe('UI Source Regressions', () => {
    it('verifies DemoApp.tsx and AuthorMap.tsx use apiAuthors and do not contain old dummy texts', () => {
      const demoAppCode = fs.readFileSync(path.join(__dirname, '../src/DemoApp.tsx'), 'utf-8');
      const mapCode = fs.readFileSync(path.join(__dirname, '../src/demo/AuthorMap.tsx'), 'utf-8');
      
      // Author page uses apiAuthors
      expect(demoAppCode).toContain('apiAuthors.map(');
      
      // Top transparency copy
      expect(demoAppCode).toContain('Oturum, Soru Havuzu, Projeler ve Yazar Ağı gerçek Pilot verisini kullanır');
      
      // Map copy checks
      expect(mapCode).not.toContain('örnek yazar');
      expect(mapCode).not.toContain('örnek kayıt');
      expect(mapCode).toContain('Pilot yazar');
      
      // Dashboard uses apiAuthors for counts
      expect(demoAppCode).toContain('apiAuthors.length.toString(');
      
      // Payments still uses demo authors
      
    });
  });
});
