import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchQuestions, createQuestion, patchQuestion, runQuestionWorkflow, ApiError } from '../src/questions/api';
import fs from 'fs';
import path from 'path';

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

  it('createQuestion uses POST, sends JSON, uses projectId null, and does not send protected fields', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 2, content: 'New' })
    });

    const result = await createQuestion({ 
      content: 'New', 
      projectId: null,
      grade: '8',
    });
    expect(result.id).toBe(2);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/questions', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ content: 'New', projectId: null, grade: '8' })
    }));
  });

  it('patchQuestion uses PATCH and only sends editable fields', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 3, content: 'Patched' })
    });

    const result = await patchQuestion(3, { content: 'Patched', explanation: 'test' });
    expect(result.id).toBe(3);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/questions/3', expect.objectContaining({
      method: 'PATCH',
      credentials: 'include',
      body: JSON.stringify({ content: 'Patched', explanation: 'test' })
    }));
  });

  it('runQuestionWorkflow submit sends exactly action: submit', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 4, status: 'INCELEMEDE' })
    });

    const result = await runQuestionWorkflow(4, 'submit');
    expect(result.id).toBe(4);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/questions/4/workflow', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ action: 'submit' })
    }));
  });

  it('runQuestionWorkflow approve sends exactly action: approve', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 4, status: 'ONAYLANDI' })
    });

    // Passing a note just to prove our api.ts ignores it for 'approve'
    const result = await runQuestionWorkflow(4, 'approve', 'some note');
    expect(result.id).toBe(4);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/questions/4/workflow', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ action: 'approve' })
    }));
  });

  it('runQuestionWorkflow request_revision sends trimmed note', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 4, status: 'REVIZYON' })
    });

    const result = await runQuestionWorkflow(4, 'request_revision', '   Fix this   ');
    expect(result.id).toBe(4);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/questions/4/workflow', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ action: 'request_revision', note: 'Fix this' })
    }));
  });

  it('runQuestionWorkflow reject sends trimmed note', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 4, status: 'REDDEDILDI' })
    });

    const result = await runQuestionWorkflow(4, 'reject', '   Too hard   ');
    expect(result.id).toBe(4);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/questions/4/workflow', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ action: 'reject', note: 'Too hard' })
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

  describe('UI Source Regressions', () => {
    it('verifies DemoApp.tsx does not contain obsolete demo state or old metric logic', () => {
      const demoAppCode = fs.readFileSync(path.join(__dirname, '../src/DemoApp.tsx'), 'utf-8');
      
      // Metrics should not use old identifiers
      expect(demoAppCode).not.toContain('q.authorId === 1');
      expect(demoAppCode).not.toContain('const updateQuestion =');
      
      // Image upload was removed
      expect(demoAppCode).not.toContain('questionImageName');
      expect(demoAppCode).not.toContain('questionImageRef');
      
      // Editor rewrite state was removed
      expect(demoAppCode).not.toContain('setEditorQuestionTitle');
      expect(demoAppCode).not.toContain('setEditorQuestionOptions');
      
      // Transparency copy states data is real
      expect(demoAppCode).toContain('Oturum ve Soru Havuzu gerçek Pilot verisini kullanır');
      
      // Dashboard uses apiQuestions for stats
      expect(demoAppCode).toContain('apiQuestions.filter');
    });
  });
});
