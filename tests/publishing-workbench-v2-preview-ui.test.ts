import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type { ApiQuestion } from '../src/questions/types';
import {
  flattenSingleChapter, frozenBookQuestions, listBookDrafts, loadBookDraft,
  prepareBookSave, publishingV2PreviewEnabled, PublishingApiError, saveBookDraft,
  type SavedBook
} from '../src/publishing/book-persistence-client';

const screen = readFileSync(new URL('../src/publishing/PublishingWorkbench.tsx', import.meta.url), 'utf8');
const panel = readFileSync(new URL('../src/publishing/PublishingPersistencePanel.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/publishing/publishing.css', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../.github/workflows/publishing-books-isolated-postgres.yml', import.meta.url), 'utf8');

function source(id: number, x: Partial<ApiQuestion> = {}): ApiQuestion {
  return {
    id, content: 'Onaylı soru ' + id, imageUrl: null, objectiveCode: null,
    grade: '11. Sınıf', difficulty: null, options: ['A','B','C','D'],
    correctAnswer: 'B', questionType: 'MULTIPLE_CHOICE', optionCount: 4,
    explanation: null, status: 'ONAYLANDI', editorNote: null,
    projectId: 5, project: { id: 5, code: 'BK-5', title: 'Yayın Projesi' },
    author: { id: 9, fullName: 'Yazar' }, isArchived: false,
    assets: [], createdAt: '2026-10-17T11:00:00.000Z',
    updatedAt: '2026-10-17T12:00:00.000Z',
    ...x
  };
}
const saved = (overrides: Partial<SavedBook> = {}): SavedBook => ({
  id: 21, projectId: 5, project: { id: 5, code: 'BK-5', title: 'Yayın Projesi' },
  title: 'Kitap Taslağı', layoutColumns: 2, status: 'Dizgi Aşamasında', revision: 3,
  updatedAt: '2026-10-18T10:00:00Z',
  chapters: [{
    id: 44, title: 'Bölüm 1', sortOrder: 0,
    questions: [2, 1].map((id, i) => ({
      id: id + 100, questionId: id, sortOrder: i,
      sourceQuestionUpdatedAt: '2026-10-17T12:00:00.000Z',
      snapshot: {
        schemaVersion: 1 as const, sourceQuestionId: id,
        sourceQuestionUpdatedAt: '2026-10-17T12:00:00.000Z',
        content: 'DONMUŞ SORU ' + id, imageUrl: '/media/a.png',
        grade: '11. Sınıf', objectiveCode: null, difficulty: null,
        questionType: 'MULTIPLE_CHOICE' as const,
        options: ['A','B','C','D'], correctAnswer: 'D',
        booleanAnswer: null, modelAnswer: null, explanation: 'Çözüm',
        scoringRubric: null, evaluationCriteria: null, authorName: 'Yazar',
        assets: [{ placement: 'STEM', assetType: 'IMAGE',
          url: '/media/a.png', title: 'Şekil', altText: 'Görsel açıklaması', sortOrder: 0 }]
      }
    }))
  }],
  ...overrides
});

describe('V2 persistence client gate and immutable preview', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('keeps save/reopen buttons hidden in production and ordinary preview builds', () => {
    expect(publishingV2PreviewEnabled({})).toBe(false);
    expect(publishingV2PreviewEnabled({ VITE_PUBLISHING_V2_PREVIEW: 'true' })).toBe(false);
    expect(publishingV2PreviewEnabled({ VITE_PUBLISHING_V2_PREVIEW: 'true', VITE_VERCEL_ENV: 'production' })).toBe(false);
    expect(publishingV2PreviewEnabled({ VITE_PUBLISHING_V2_PREVIEW: 'true', VITE_VERCEL_ENV: 'preview' })).toBe(true);
    expect(screen).toContain('publishingPreview && <PublishingPersistencePanel');
    expect(screen).toContain('publishingV2PreviewEnabled(import.meta.env)');
    expect(panel).toContain('Kitabı Kaydet');
    expect(panel).toContain('Kayıtlı Kitaplarım');
    expect(panel).toContain('Taslağı Düzenle');
    expect(panel).not.toContain('localStorage');
  });

  it('reopens exactly one chapter in manually saved question order; multi-chapter books fail closed', () => {
    expect(flattenSingleChapter(saved())).toEqual({ chapter: 'Bölüm 1', questionIds: [2, 1] });
    const two = saved({ chapters: [...saved().chapters, { id: 55, title: 'Başka bölüm', sortOrder: 1, questions: [] }] });
    expect(() => flattenSingleChapter(two)).toThrow('birden fazla bölüm');
  });

  it('previews frozen content and answer key after a source has changed or been deleted', () => {
    const book = saved();
    const entries = frozenBookQuestions(book);
    expect(entries.map(q => q.id)).toEqual([2, 1]);
    expect(entries[0].content).toBe('DONMUŞ SORU 2');
    expect(entries[0].correctAnswer).toBe('D');
    expect(entries[0].assets?.[0]).toMatchObject({ placement: 'STEM', url: '/media/a.png' });
    expect(screen).toContain('snapshots.get(id) ?? liveMap.get(id)');
    expect(screen).toContain('setWithAnswerKey(false)');
  });

  it('rejects mixed project, missing/archive status, stale source and invalid headers before POST/PATCH', () => {
    const view = { projectFilter: '5', title: 'Kitap Taslağı', chapter: 'Bölüm 1',
      columns: 2 as const, selectedIds: [2, 1] };
    expect(prepareBookSave(view, [source(1), source(2)], null)).toMatchObject({
      projectId: 5, expectedRevision: null,
      chapters: [{ title: 'Bölüm 1', questionIds: [2, 1] }]
    });
    expect(prepareBookSave(view, [source(1), source(2)], saved()).expectedRevision).toBe(3);
    expect(() => prepareBookSave({ ...view, projectFilter: 'all' }, [source(1), source(2)], null)).toThrow('tek bir kitap projesi');
    expect(() => prepareBookSave(view, [source(1), source(2, { projectId: 9 })], null)).toThrow('projede değil');
    expect(() => prepareBookSave(view, [source(1), source(2, { isArchived: true })], null)).toThrow('aktif');
    expect(() => prepareBookSave(view, [source(1)], saved())).toThrow('aktif');
    expect(() => prepareBookSave(view, [source(1), source(2, { updatedAt: '2026-10-18T13:00:00.000Z' })], saved()))
      .toThrow('sonradan güncellenmiş');
    expect(() => prepareBookSave({ ...view, selectedIds: [2, 2] }, [source(1), source(2)], null))
      .toThrow('benzersiz');
    expect(() => prepareBookSave(view, [source(1), source(2)], saved({ status: 'Basıldı' }))).toThrow('Yayınlanmış');
  });

  it('uses authenticated no-cache GET, POST and revision-dependent PATCH', async () => {
    const fake = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ books: [{ id: 1 }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ book: saved() }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ book: { id: 21, revision: 1 } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ book: { id: 21, revision: 4 } }) });
    vi.stubGlobal('fetch', fake);
    await listBookDrafts();
    await loadBookDraft(21);
    const payload = prepareBookSave({ projectFilter:'5', title:'Kitap Taslağı', chapter:'Bölüm 1',
      columns:2, selectedIds:[2,1] }, [source(1),source(2)], null);
    await saveBookDraft(payload, null);
    await saveBookDraft({ ...payload, expectedRevision: 3 }, 21);
    expect(fake.mock.calls.map(([url]) => url)).toEqual([
      '/api/v1/books','/api/v1/books/21','/api/v1/books','/api/v1/books/21'
    ]);
    expect(fake.mock.calls.map(([, init]) => init.credentials)).toEqual(['include','include','include','include']);
    expect(fake.mock.calls[2][1]).toMatchObject({ method: 'POST', cache:'no-store' });
    expect(fake.mock.calls[3][1]).toMatchObject({ method: 'PATCH', cache:'no-store' });
    expect(JSON.parse(fake.mock.calls[3][1].body).expectedRevision).toBe(3);
  });

  it('preserves local changes on HTTP 409 and does not silently retry or auto-save', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 409, json: async () => ({ error: 'stale' })
    }));
    await expect(saveBookDraft({ projectId:5, title:'Kitap', layoutColumns:1,
      expectedRevision:3, chapters:[{ title:'Bir', questionIds:[1] }] }, 21))
      .rejects.toMatchObject({ status: 409, name: 'PublishingApiError' });
    expect(panel).toContain('if (busyRef.current) return');
    expect(panel).toContain('const payload = prepareBookSave(view, questions, activeBook)');
    expect(panel).toContain('const reopened = await loadBookDraft(result.id)');
    expect(panel).toContain('onOpen(reopened)');
    expect(panel).not.toContain('window.localStorage');
  });

  it('excludes book management from PDF and keeps isolated PostgreSQL acceptance workflow', () => {
    expect(css).toContain('.demo-shell:has(.publishing-workbench) .publishing-persistence');
    expect(workflow).toContain('127.0.0.1:5432/prolig_book_ci');
    expect(workflow).toContain('npx prisma migrate deploy');
    expect(workflow).not.toContain('NEON_API_KEY');
  });
});
