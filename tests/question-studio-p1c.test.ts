import { describe, expect, it } from 'vitest';
import { webcrypto } from 'node:crypto';
import {
  durableQuestionDraftKey, hasDurableQuestionDraft, recoverEncryptedQuestionDraft,
  removeEncryptedQuestionDraft, saveEncryptedQuestionDraft, STUDIO_DRAFT_TTL_MS,
  validateDraftPassphrase, type StudioDraftStorage, type StudioDurableDraftData
} from '../src/questions/studio-durable';
import fs from 'node:fs';
import path from 'node:path';

class MemoryStorage implements StudioDraftStorage {
  readonly records = new Map<string, string>();
  getItem(key: string) { return this.records.get(key) ?? null; }
  setItem(key: string, value: string) { this.records.set(key, value); }
  removeItem(key: string) { this.records.delete(key); }
}

const owner = { id: 42, email: 'YAZAR@example.test' };
const alternate = { id: 43, email: 'yazar@example.test' };
const cryptoApi = webcrypto as unknown as Crypto;
const phrase = 'Benim bağımsız kurtarma parolam 2026!';
const now = Date.UTC(2026, 9, 11, 12, 0, 0);
const data: StudioDurableDraftData = {
  values: {
    content: '7. sınıf üçgenler sorusu: ç = 12', level: 'Ortaokul',
    grade: '7. Sınıf', projectId: 4, options: ['Bir', 'İki', 'Üç', 'Dört'],
    correctAnswer: 'D', explanation: 'Üçgenin çevresi...', assets: [{
      placement: 'STEM', assetType: 'IMAGE', url: 'https://example.org/test.png', altText: 'Örnek üçgen'
    }],
    assetPlacement: 'STEM', assetType: 'VIDEO_URL',
    assetUrl: 'https://example.org/video', assetTitle: 'Ders videosu',
    assetAltText: 'Çözüm videosu'
  },
  baseline: 'test baseline', originalProjectId: 4, serverUpdatedAt: '2026-10-11T12:00:00.000Z'
};

describe('P1-C encrypted local draft recovery', () => {
  it('encrypts complete forms, excludes all text and passphrase from stored record, and restores exactly', async () => {
    const storage = new MemoryStorage();
    await saveEncryptedQuestionDraft(storage, cryptoApi, owner, 7, phrase, data, now);
    const raw = storage.getItem(durableQuestionDraftKey(owner, 7)) || '';
    expect(raw).not.toContain('7. sınıf');
    expect(raw).not.toContain('Üçgen');
    expect(raw).not.toContain('test baseline');
    expect(raw).not.toContain(phrase);
    expect(raw).not.toContain('example.org');
    expect(hasDurableQuestionDraft(storage, owner, 7, now)).toBe(true);
    expect(await recoverEncryptedQuestionDraft(storage, cryptoApi, owner, 7, phrase, now)).toEqual(data);
    expect(await recoverEncryptedQuestionDraft(storage, cryptoApi, owner, null, phrase, now)).toBeNull();
  });

  it('rejects incorrect recovery password without changing the ciphertext', async () => {
    const storage = new MemoryStorage();
    await saveEncryptedQuestionDraft(storage, cryptoApi, owner, null, phrase, data, now);
    const key = durableQuestionDraftKey(owner, null);
    const before = storage.getItem(key);
    await expect(recoverEncryptedQuestionDraft(storage, cryptoApi, owner, null, 'Yanlış parola', now))
      .rejects.toThrow('Taslak açılamadı');
    expect(storage.getItem(key)).toBe(before);
  });

  it('separates question, author ID and author email on the same origin', async () => {
    const storage = new MemoryStorage();
    await saveEncryptedQuestionDraft(storage, cryptoApi, owner, 8, phrase, data, now);
    expect(hasDurableQuestionDraft(storage, alternate, 8, now)).toBe(false);
    expect(hasDurableQuestionDraft(storage, { id: 42, email: 'someone.else@example.test' }, 8, now)).toBe(false);
    expect(hasDurableQuestionDraft(storage, owner, 9, now)).toBe(false);
    expect(durableQuestionDraftKey({ ...owner, email: 'yazar@EXAMPLE.TEST' }, 8)).toBe(durableQuestionDraftKey(owner, 8));
  });

  it('expires and deletes encrypted data at exactly seven days', async () => {
    const storage = new MemoryStorage();
    await saveEncryptedQuestionDraft(storage, cryptoApi, owner, null, phrase, data, now);
    expect(hasDurableQuestionDraft(storage, owner, null, now + STUDIO_DRAFT_TTL_MS - 1)).toBe(true);
    expect(hasDurableQuestionDraft(storage, owner, null, now + STUDIO_DRAFT_TTL_MS)).toBe(false);
    expect(storage.records.size).toBe(0);
    expect(await recoverEncryptedQuestionDraft(storage, cryptoApi, owner, null, phrase, now + STUDIO_DRAFT_TTL_MS)).toBeNull();
  });

  it('detects ciphertext tampering without returning a corrupted draft', async () => {
    const storage = new MemoryStorage();
    await saveEncryptedQuestionDraft(storage, cryptoApi, owner, null, phrase, data, now);
    const key = durableQuestionDraftKey(owner, null);
    const record = JSON.parse(storage.getItem(key)!) as { ciphertext: string };
    record.ciphertext = record.ciphertext.slice(0, -2) + (record.ciphertext.endsWith('aa') ? 'bb' : 'aa');
    storage.setItem(key, JSON.stringify(record));
    await expect(recoverEncryptedQuestionDraft(storage, cryptoApi, owner, null, phrase, now)).rejects.toThrow('Taslak açılamadı');
  });

  it('does not commit encrypted data after server-success invalidation', async () => {
    const storage = new MemoryStorage();
    await saveEncryptedQuestionDraft(storage, cryptoApi, owner, null, phrase, data, now, () => false);
    expect(storage.records.size).toBe(0);
  });

  it('clears only matching question data after a successful save', async () => {
    const storage = new MemoryStorage();
    await saveEncryptedQuestionDraft(storage, cryptoApi, owner, 1, phrase, data, now);
    await saveEncryptedQuestionDraft(storage, cryptoApi, owner, 2, phrase, data, now);
    removeEncryptedQuestionDraft(storage, owner, 1);
    expect(hasDurableQuestionDraft(storage, owner, 1, now)).toBe(false);
    expect(hasDurableQuestionDraft(storage, owner, 2, now)).toBe(true);
  });

  it('enforces minimum password length and refuses malformed or expired records', () => {
    expect(() => validateDraftPassphrase('kısa')).toThrow('12 karakter');
    expect(() => validateDraftPassphrase(phrase)).not.toThrow();
    const storage = new MemoryStorage();
    const key = durableQuestionDraftKey(owner, null);
    storage.setItem(key, '{"version":1,"ownerId":42}');
    expect(hasDurableQuestionDraft(storage, owner, null, now)).toBe(false);
    expect(storage.getItem(key)).toBeNull();
  });

  it('prohibits implicit storage unless explicitly opted in, and locks old server versions', () => {
    const app = fs.readFileSync(path.join(process.cwd(), 'src/DemoApp.tsx'), 'utf8');
    expect(app).toContain('questionStudioReleaseFlags.durableRecovery');
    expect(app).toContain('const [durableDraftEnabled, setDurableDraftEnabled] = useState(false)');
    expect(app).toContain('validateDraftPassphrase(phrase)');
    expect(app).toContain('if (!durableFeatureOn || !showQuestionForm) return;');
    expect(app).toContain('const stale = Boolean(editingQuestion && restored.serverUpdatedAt !== editingQuestion.updatedAt)');
    expect(app).toContain('setDurableDraftConflict(stale)');
    expect(app).toContain('if (durableDraftConflict) {');
    expect(app).toContain('removeEncryptedQuestionDraft(window.localStorage, durableDraftOwner, durableQuestionId)');
    expect(app).toContain('Otomatik kurtarmayı durdur');
    expect(app).toContain('conflicted: durableDraftConflict');
    // P1-C recovery gate still closes before either P2 wizard or legacy editor.
    // Verify both branches so a layout refactor cannot quietly drop the legacy fallback.
    const normalized = app.replace(/\r\n/g, '\n');
    expect(normalized).toContain('</section>}\n          {guidedStudioOn ? <GuidedQuestionStudio');
    expect(normalized).toContain(' /> : <div className="question-studio-layout" inert=');
  });
});
