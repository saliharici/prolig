import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchQuestions, createQuestion, patchQuestion, runQuestionWorkflow, ApiError } from '../src/questions/api';

const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('Question API Frontend Client', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchQuestions uses correct path and credentials', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 1, content: 'Test' }]
    });

    const result = await fetchQuestions();
    expect(result).toEqual([{ id: 1, content: 'Test' }]);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/questions', expect.objectContaining({
      credentials: 'include'
    }));
  });

  it('createQuestion uses POST and sends JSON', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 2, content: 'New' })
    });

    const result = await createQuestion({ content: 'New' });
    expect(result.id).toBe(2);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/questions', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ content: 'New' })
    }));
  });

  it('patchQuestion uses PATCH and sends JSON', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 3, content: 'Patched' })
    });

    const result = await patchQuestion(3, { content: 'Patched' });
    expect(result.id).toBe(3);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/questions/3', expect.objectContaining({
      method: 'PATCH',
      credentials: 'include',
      body: JSON.stringify({ content: 'Patched' })
    }));
  });

  it('runQuestionWorkflow uses POST to /workflow and sends action/note', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 4, status: 'ONAYLANDI' })
    });

    const result = await runQuestionWorkflow(4, 'approve', 'Good job');
    expect(result.id).toBe(4);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/questions/4/workflow', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ action: 'approve', note: 'Good job' })
    }));
  });

  describe('Error Mapping', () => {
    const runErrorTest = async (status: number, body: any, expectedMessage: string) => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status,
        json: async () => body
      });
      await expect(fetchQuestions()).rejects.toThrowError(new ApiError(status, expectedMessage));
    };

    it('maps 400 with API error message', () => runErrorTest(400, { error: 'Validation failed' }, 'Doğrulama hatası: Validation failed'));
    it('maps 401', () => runErrorTest(401, {}, 'Oturum süresi dolmuş veya yetkisiz.'));
    it('maps 403', () => runErrorTest(403, {}, 'Bu işlem için yetkiniz yok.'));
    it('maps 404', () => runErrorTest(404, {}, 'Kayıt bulunamadı.'));
    it('maps 409', () => runErrorTest(409, {}, 'Soru başka bir işlemle güncellendi. Güncel kayıt yeniden yüklendi.'));
    it('maps 500', () => runErrorTest(500, {}, 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.'));
  });
});
