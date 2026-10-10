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
    it('renders live Yazar Ağı insight cards from authors and tasks', () => {
      const demoAppCode = fs.readFileSync(path.join(__dirname, '../src/DemoApp.tsx'), 'utf-8');
      const cssCode = fs.readFileSync(path.join(__dirname, '../src/demo.css'), 'utf-8');

      expect(demoAppCode).toContain('İllere Göre Yazar Dağılımı');
      expect(demoAppCode).toContain('Branşlara Göre Dağılım');
      expect(demoAppCode).toContain('Yaklaşan Teslim Tarihleri');
      expect(demoAppCode).toContain('Son Eklenen Yazarlar');
      expect(demoAppCode).toContain('Kademelere Göre Dağılım');
      expect(demoAppCode).toContain('fetchTasks().then(setAuthorInsightTasks)');
      expect(demoAppCode).toContain('new Date(b.createdAt).getTime()');
      expect(cssCode).toContain('.author-insights{');
      expect(cssCode).toContain('.author-donut{');
      expect(cssCode).toContain('.author-level-list{');
    });

    it('verifies DemoApp.tsx and AuthorMap.tsx use apiAuthors and do not contain old dummy texts', () => {
      const demoAppCode = fs.readFileSync(path.join(__dirname, '../src/DemoApp.tsx'), 'utf-8');
      const mapCode = fs.readFileSync(path.join(__dirname, '../src/demo/AuthorMap.tsx'), 'utf-8');
      
      // Author page uses apiAuthors
      expect(demoAppCode).toContain('apiAuthors.map(');
      
      // Production screens do not display obsolete test-environment banners.
      expect(demoAppCode).not.toContain('Pro Lig test ortamı');
      expect(demoAppCode).not.toContain('Örnek verileri sıfırla');
      
      // Map copy checks
      expect(mapCode).not.toContain('örnek yazar');
      expect(mapCode).not.toContain('örnek kayıt');
      expect(mapCode).toContain('yetki kapsamınızdaki yazarların');
      expect(mapCode).not.toContain('Pilot yazar');
      
      // Dashboard uses apiAuthors for counts
      expect(demoAppCode).toContain('apiAuthors.length.toString(');
      
      
    });
  });
});
