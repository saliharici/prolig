#!/usr/bin/env node
/**
 * P1-D question roundtrip gate: separate local-only pilot config + sandbox-only JWT secret.
 *
 * --preflight: read-only DB identity and fixture check. Does not permit writes.
 * --run-integration: writes disposable pilot Question/ActivityLog data only after
 *   dedicated explicit operator approval, then delegates to p1d-pilot-check.mjs.
 *
 * This launcher never reads database credentials from process.env or ordinary .env.
 * It builds a fresh minimal child env that overrides dotenv defaults.
 */
import { existsSync, readFileSync } from 'node:fs';
import dotenv from 'dotenv';
import { spawnSync } from 'node:child_process';

const DB = 'prolig_p1d_sandbox';
const PILOT = '.env.p1d.local';
const PRIVATE = '.local/p1d-sandbox-credentials.env';
const APPROVAL = 'ALLOW_TEMP_QUESTION_WRITES_IN_prolig_p1d_sandbox';
const ORIGINAL_FILES = ['.env', '.env.development.local'];
const REQUIRED_USERS = ['GENEL_KOORDINATOR','BOLGE_KOORDINATORU','IL_KOORDINATORU','EDITOR','YAZAR','MUHASEBE'];
class GuardError extends Error {}
const reject = message => { throw new GuardError(message); };
const parseFile = path => existsSync(path) ? dotenv.parse(readFileSync(path)) : null;
const endpoint = url => url.hostname.toLowerCase().replace(/-pooler(?=\.)/, '');

function parseUrl(value, pooled) {
  let uri;
  try { uri = new URL(value); } catch { reject('Sandbox URL okunamıyor.'); }
  if (!['postgres:', 'postgresql:'].includes(uri.protocol) ||
      !uri.hostname.toLowerCase().endsWith('.neon.tech') ||
      uri.pathname !== '/' + DB || !uri.username || !uri.password ||
      uri.hostname.includes('-pooler.') !== pooled) {
    reject('Sandbox PostgreSQL URL türü veya hedef veritabanı hatalı.');
  }
  return uri;
}

function verifyConfiguration() {
  const p = parseFile(PILOT);
  const secrets = parseFile(PRIVATE);
  if (!p || !secrets) reject('İzole pilot veya ayrı yapay test kimlik dosyası bulunamadı.');
  if (p.PROLIG_P1D_DB_NAME !== DB ||
      p.PROLIG_PILOT_DB_CONFIRMED !== 'false' ||
      p.PROLIG_P1D_ALLOW_WRITES !== 'false') {
    reject('Pilot yapılandırmasındaki güvenlik bayrakları kapalı değil.');
  }
  const pooled = parseUrl(p.DATABASE_URL, true);
  const direct = parseUrl(p.DIRECT_URL, false);
  if (endpoint(pooled) !== endpoint(direct) || pooled.username !== direct.username) {
    reject('Pilot bağlantı adresleri ayrı Neon sunucularına/rollerine gidiyor.');
  }
  const originalHosts = [];
  for (const file of ORIGINAL_FILES) {
    const orig = parseFile(file);
    if (!orig) continue;
    for (const key of ['DATABASE_URL','DIRECT_URL','POSTGRES_URL','POSTGRES_PRISMA_URL']) {
      if (!orig[key]) continue;
      try { originalHosts.push(endpoint(new URL(orig[key]))); }
      catch { reject('Eski yerel bağlantı karşılaştırılamıyor.'); }
    }
  }
  if (!originalHosts.length || originalHosts.includes(endpoint(direct))) {
    reject('Yeni pilot bağlantısı eski yerel PRO-LIG Neon ortamından bağımsız değil.');
  }
  if (typeof secrets.AUTH_SECRET !== 'string' ||
      !/^[0-9a-f]{96}$/i.test(secrets.AUTH_SECRET)) {
    reject('Sandbox ayrı AUTH_SECRET eksik veya beklenen rastgele biçimde değil.');
  }
  for (const role of REQUIRED_USERS) {
    const key = 'PILOT_' + role + '_PASSWORD';
    if (!/^[0-9a-f]{48}$/i.test(secrets[key] || '')) {
      reject('Sandbox yapay kullanıcı kimlik bilgilerinin tamamı bulunamadı.');
    }
  }
  // Ensure authentication used by tests is sandbox-only, never inherited.
  return { pilot: p, authSecret: secrets.AUTH_SECRET, hostname: pooled.hostname };
}

function sanitizedChildEnv(pilot, secret, hostname, write) {
  const pass = {};
  for (const name of [
    'PATH','Path','PATHEXT','SystemRoot','WINDIR','ComSpec','TEMP','TMP',
    'USERPROFILE','APPDATA','LOCALAPPDATA','HOME','HOMEDRIVE','HOMEPATH'
  ]) {
    if (process.env[name]) pass[name] = process.env[name];
  }
  return {
    ...pass,
    DATABASE_URL: pilot.DATABASE_URL,
    DIRECT_URL: pilot.DIRECT_URL,
    AUTH_SECRET: secret,
    PROLIG_P1D_DB_NAME: DB,
    PROLIG_P1D_DB_HOST: hostname,
    PROLIG_PILOT_DB_CONFIRMED: 'true',
    PROLIG_P1D_ALLOW_WRITES: write ? 'true' : 'false',
    DOTENV_CONFIG_PATH: PILOT,
    NODE_ENV: 'test'
  };
}

const argv = process.argv.slice(2);
const mode = argv.length === 0 ? '--preflight' : argv.length === 1 ? argv[0] : 'invalid';
try {
  if (!['--preflight','--run-integration'].includes(mode)) {
    reject('Sadece --preflight veya --run-integration kullanılabilir.');
  }
  const write = mode === '--run-integration';
  if (write && process.env.PROLIG_P1D_QUESTION_TEST_APPROVAL !== APPROVAL) {
    reject('Soru kaydı yazma onayı eksik. Onaylanmadan entegrasyon testi çalışmaz.');
  }
  const { pilot, authSecret, hostname } = verifyConfiguration();
  console.log('PASS: Ayrı Neon sandbox ve gizli yapay test anahtarı doğrulandı.');
  const child = sanitizedChildEnv(pilot, authSecret, hostname, write);
  const result = spawnSync(
    process.execPath,
    ['scripts/p1d-pilot-check.mjs', ...(write ? ['--run-integration'] : [])],
    { cwd: process.cwd(), env: child, stdio: 'inherit', windowsHide: true, timeout: 180000 }
  );
  if (result.error || result.status !== 0) {
    reject('P1-D ' + (write ? 'soru entegrasyon testi' : 'salt okunur ön denetim') +
      ' başarısız; kod=' + (Number.isInteger(result.status) ? result.status : 'PROCESS_ERROR'));
  }
  console.log(write
    ? 'P1-D SANDBOX QUESTION INTEGRATION: PASS — test sorusu işlemleri tamamlandı.'
    : 'P1-D SANDBOX QUESTION PREFLIGHT: PASS — veri değiştirilmedi.');
} catch (error) {
  console.error('P1-D SANDBOX QUESTION GATE: FAIL — ' +
    (error instanceof GuardError ? error.message : 'Beklenmeyen güvenlik hatası.'));
  process.exitCode = 1;
}
