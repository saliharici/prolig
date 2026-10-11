import type { QuestionStudioFormValues } from './studio-state';

const VERSION = 1;
export const STUDIO_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const STUDIO_MIN_PASSPHRASE_LENGTH = 12;
const ITERATIONS = 210_000;
const MAX_PLAINTEXT_SIZE = 60_000;
const MAX_ENVELOPE_SIZE = 145_000;

export interface StudioDraftOwner {
  id: number;
  email: string;
}

export interface StudioDurableDraftData {
  values: QuestionStudioFormValues;
  baseline: string;
  originalProjectId: number | null;
  serverUpdatedAt: string | null;
}

interface StudioDraftEnvelope {
  version: 1;
  ownerId: number;
  ownerEmail: string;
  questionId: number | null;
  savedAt: number;
  expiresAt: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

export interface StudioDraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function normalizedEmail(email: string): string {
  return email.trim().toLocaleLowerCase('en-US');
}

export function durableQuestionDraftKey(owner: StudioDraftOwner, questionId: number | null): string {
  if (!Number.isSafeInteger(owner.id) || owner.id < 1 || !normalizedEmail(owner.email)) {
    throw new Error('Taslak sahibi doğrulanamadı.');
  }
  if (questionId !== null && (!Number.isSafeInteger(questionId) || questionId < 1)) {
    throw new Error('Taslak soru kimliği geçersiz.');
  }
  return 'prolig:p1c:encrypted-draft:v1:' + owner.id + ':' +
    encodeURIComponent(normalizedEmail(owner.email)) + ':' + (questionId === null ? 'new' : questionId);
}

export function validateDraftPassphrase(passphrase: string): void {
  if (passphrase.length < STUDIO_MIN_PASSPHRASE_LENGTH) {
    throw new Error('Kurtarma parolası en az 12 karakter olmalıdır.');
  }
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

function bytesFromHex(value: string, expectedBytes?: number): Uint8Array {
  if (!/^(?:[0-9a-f]{2})+$/i.test(value) || (expectedBytes !== undefined && value.length !== expectedBytes * 2)) {
    throw new Error('Şifreli taslak biçimi geçersiz.');
  }
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array, cryptoApi: Crypto): Promise<CryptoKey> {
  const source = await cryptoApi.subtle.importKey(
    'raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  return cryptoApi.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    source, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}

function parseEnvelope(
  raw: string | null,
  owner: StudioDraftOwner,
  questionId: number | null,
  now: number,
  storage: StudioDraftStorage,
  key: string
): StudioDraftEnvelope | null {
  if (!raw) return null;
  try {
    if (raw.length > MAX_ENVELOPE_SIZE) throw new Error('oversize');
    const x = JSON.parse(raw) as Partial<StudioDraftEnvelope>;
    if (x.version !== VERSION || x.ownerId !== owner.id || x.ownerEmail !== normalizedEmail(owner.email) ||
        x.questionId !== questionId || typeof x.savedAt !== 'number' || !Number.isFinite(x.savedAt) ||
        typeof x.expiresAt !== 'number' || !Number.isFinite(x.expiresAt) ||
        x.savedAt > now + 60_000 || x.expiresAt > x.savedAt + STUDIO_DRAFT_TTL_MS ||
        x.expiresAt <= now || typeof x.salt !== 'string' || typeof x.iv !== 'string' ||
        typeof x.ciphertext !== 'string' || x.ciphertext.length < 32) throw new Error('invalid envelope');
    bytesFromHex(x.salt, 16);
    bytesFromHex(x.iv, 12);
    bytesFromHex(x.ciphertext);
    return x as StudioDraftEnvelope;
  } catch {
    try { storage.removeItem(key); } catch { /* Browser storage can be unavailable */ }
    return null;
  }
}

export function hasDurableQuestionDraft(
  storage: StudioDraftStorage,
  owner: StudioDraftOwner,
  questionId: number | null,
  now = Date.now()
): boolean {
  const key = durableQuestionDraftKey(owner, questionId);
  const envelope = parseEnvelope(storage.getItem(key), owner, questionId, now, storage, key);
  return envelope !== null;
}

function isStudioDraftData(value: unknown): value is StudioDurableDraftData {
  if (!value || typeof value !== 'object') return false;
  const x = value as Partial<StudioDurableDraftData>;
  const v = x.values;
  if (!v || typeof v !== 'object') return false;
  if (typeof x.baseline !== 'string' || x.baseline.length > MAX_PLAINTEXT_SIZE ||
      (x.originalProjectId !== null && (!Number.isSafeInteger(x.originalProjectId) || (x.originalProjectId ?? 0) < 1)) ||
      (x.serverUpdatedAt !== null && typeof x.serverUpdatedAt !== 'string')) return false;
  if (typeof v.content !== 'string' || typeof v.level !== 'string' || typeof v.grade !== 'string' ||
      (v.projectId !== null && (!Number.isSafeInteger(v.projectId) || (v.projectId ?? 0) < 1)) ||
      !Array.isArray(v.options) || v.options.length !== 4 || !v.options.every(x => typeof x === 'string') ||
      typeof v.correctAnswer !== 'string' || typeof v.explanation !== 'string' ||
      !Array.isArray(v.assets) || v.assets.length > 20 ||
      !v.assets.every(asset => asset && typeof asset === 'object' &&
        typeof asset.url === 'string' && ['STEM','OPTION_A','OPTION_B','OPTION_C','OPTION_D','EXPLANATION'].includes(asset.placement) &&
        ['IMAGE','VIDEO_URL','LINK'].includes(asset.assetType)) ||
      !['STEM','OPTION_A','OPTION_B','OPTION_C','OPTION_D','EXPLANATION'].includes(v.assetPlacement) ||
      !['IMAGE','VIDEO_URL','LINK'].includes(v.assetType) ||
      typeof v.assetUrl !== 'string' || typeof v.assetTitle !== 'string' ||
      typeof v.assetAltText !== 'string') return false;
  return true;
}

export async function saveEncryptedQuestionDraft(
  storage: StudioDraftStorage,
  cryptoApi: Crypto,
  owner: StudioDraftOwner,
  questionId: number | null,
  passphrase: string,
  draft: StudioDurableDraftData,
  now = Date.now(),
  shouldCommit: () => boolean = () => true
): Promise<void> {
  validateDraftPassphrase(passphrase);
  if (!isStudioDraftData(draft)) throw new Error('Taslak alanları geçersiz.');
  const plain = JSON.stringify(draft);
  if (plain.length > MAX_PLAINTEXT_SIZE) throw new Error('Taslak yerel kurtarma sınırını aşıyor.');
  const key = durableQuestionDraftKey(owner, questionId);
  const salt = cryptoApi.getRandomValues(new Uint8Array(16));
  const iv = cryptoApi.getRandomValues(new Uint8Array(12));
  const encryptionKey = await deriveKey(passphrase, salt, cryptoApi);
  const ciphertext = await cryptoApi.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(key) },
    encryptionKey, new TextEncoder().encode(plain)
  );
  const envelope: StudioDraftEnvelope = {
    version: 1, ownerId: owner.id, ownerEmail: normalizedEmail(owner.email), questionId,
    savedAt: now, expiresAt: now + STUDIO_DRAFT_TTL_MS,
    salt: hex(salt), iv: hex(iv), ciphertext: hex(new Uint8Array(ciphertext))
  };
  // Prevent a pending encryption operation from recreating a draft after server save.
  if (shouldCommit()) storage.setItem(key, JSON.stringify(envelope));
}

export async function recoverEncryptedQuestionDraft(
  storage: StudioDraftStorage,
  cryptoApi: Crypto,
  owner: StudioDraftOwner,
  questionId: number | null,
  passphrase: string,
  now = Date.now()
): Promise<StudioDurableDraftData | null> {
  const key = durableQuestionDraftKey(owner, questionId);
  const envelope = parseEnvelope(storage.getItem(key), owner, questionId, now, storage, key);
  if (!envelope) return null;
  try {
    const decryptionKey = await deriveKey(passphrase, bytesFromHex(envelope.salt, 16), cryptoApi);
    const plain = await cryptoApi.subtle.decrypt({
      name: 'AES-GCM', iv: bytesFromHex(envelope.iv, 12),
      additionalData: new TextEncoder().encode(key)
    }, decryptionKey, bytesFromHex(envelope.ciphertext));
    const content = new TextDecoder('utf-8', { fatal: true }).decode(plain);
    if (content.length > MAX_PLAINTEXT_SIZE) throw new Error('oversized');
    const value: unknown = JSON.parse(content);
    if (!isStudioDraftData(value)) throw new Error('invalid');
    return value;
  } catch {
    throw new Error('Taslak açılamadı. Kurtarma parolasını kontrol edin; kayıt bozulmuş da olabilir.');
  }
}

export function removeEncryptedQuestionDraft(
  storage: StudioDraftStorage, owner: StudioDraftOwner, questionId: number | null
): void {
  storage.removeItem(durableQuestionDraftKey(owner, questionId));
}
