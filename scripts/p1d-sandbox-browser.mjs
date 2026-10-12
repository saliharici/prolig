#!/usr/bin/env node
/**
 * P1-D sandbox-only browser launcher. Never invokes Vercel CLI.
 * Default --preflight is READ ONLY; --serve starts local read-only browser preview.
 * Optional --serve-write additionally requires explicit browser-UAT write approval.
 * Never imports original .env app/database credentials into the child process.
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import dotenv from 'dotenv';
import pg from 'pg';

const PILOT = '.env.p1d.local';
const PRIVATE = '.local/p1d-sandbox-credentials.env';
const TARGET = 'prolig_p1d_sandbox';
const APPROVAL = 'ALLOW_BROWSER_QUESTION_WRITES_IN_prolig_p1d_sandbox';
class SafetyError extends Error {}
const stop = text => { throw new SafetyError(text); };
const fileEnv = file => existsSync(file) ? dotenv.parse(readFileSync(file)) : null;
const endpoint = url => url.hostname.toLowerCase().replace(/-pooler(?=\.)/, '');

function parsePilotUrl(value, pooled) {
  let u;
  try { u = new URL(value); } catch { stop('Sandbox bağlantı adresi eksik veya geçersiz.'); }
  if (!['postgres:', 'postgresql:'].includes(u.protocol) ||
      !u.hostname.toLowerCase().endsWith('.neon.tech') ||
      !u.username || !u.password ||
      u.pathname !== '/' + TARGET ||
      u.hostname.includes('-pooler.') !== pooled) {
    stop('Sandbox bağlantısının adı veya türü beklenenden farklı.');
  }
  return u;
}

function prepare() {
  const pilot = fileEnv(PILOT);
  const credentials = fileEnv(PRIVATE);
  if (!pilot || !credentials) stop('Ayrı pilot bağlantı veya sandbox gizli dosyası bulunamadı.');
  if (pilot.PROLIG_P1D_DB_NAME !== TARGET ||
      pilot.PROLIG_PILOT_DB_CONFIRMED !== 'false' ||
      pilot.PROLIG_P1D_ALLOW_WRITES !== 'false') {
    stop('Sandbox dosyası beklenen kapalı yazma bayraklarını içermiyor.');
  }
  const pooled = parsePilotUrl(pilot.DATABASE_URL, true);
  const direct = parsePilotUrl(pilot.DIRECT_URL, false);
  if (endpoint(pooled) !== endpoint(direct) || pooled.username !== direct.username) {
    stop('Pooling ve direct adresleri birbiriyle eşleşmiyor.');
  }
  const existing = [];
  for (const path of ['.env','.env.development.local']) {
    const original = fileEnv(path);
    if (!original) continue;
    for (const name of ['DATABASE_URL','DIRECT_URL','POSTGRES_URL','POSTGRES_PRISMA_URL']) {
      if (!original[name]) continue;
      try { existing.push(endpoint(new URL(original[name]))); }
      catch { stop('Mevcut yerel veritabanı sunucusunun kimliği çözümlenemedi.'); }
    }
  }
  if (!existing.length || existing.includes(endpoint(direct))) {
    stop('Sandbox mevcut PRO-LIG veritabanından bağımsız değil.');
  }
  if (!/^[a-f0-9]{96}$/i.test(credentials.AUTH_SECRET || '')) {
    stop('Ayrı sandbox AUTH_SECRET eksik.');
  }
  return { pilot, authSecret: credentials.AUTH_SECRET };
}

async function preflight(connectionString) {
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 14000 });
  let tx = false;
  try {
    await client.connect();
    await client.query('BEGIN READ ONLY');
    tx = true;
    const r = await client.query(
      'SELECT current_database() AS db, current_schema() AS namespace, ' +
      "to_regclass('public.\"User\"') IS NOT NULL AS has_users"
    );
    if (r.rows[0]?.db !== TARGET || r.rows[0]?.namespace !== 'public' || !r.rows[0]?.has_users) {
      stop('Bağlanılan veritabanı veya pilot şeması beklenenden farklı.');
    }
    const fixtures = await client.query(
      'SELECT email FROM public."User" WHERE email = ANY($1::text[])',
      [['pilot.yazar@prolig.local','pilot.editor@prolig.local']]
    );
    if (fixtures.rowCount !== 2) stop('Yazar/editör pilot kullanıcıları eksik.');
    await client.query('COMMIT');
    tx = false;
  } catch (error) {
    if (tx) await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

function isolatedEnvironment(config, allowWrites) {
  const result = {};
  for (const key of [
    'PATH','Path','PATHEXT','SystemRoot','WINDIR','ComSpec',
    'TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','HOME','HOMEDRIVE','HOMEPATH'
  ]) {
    if (process.env[key]) result[key] = process.env[key];
  }
  return {
    ...result,
    DATABASE_URL: config.pilot.DATABASE_URL,
    DIRECT_URL: config.pilot.DIRECT_URL,
    AUTH_SECRET: config.authSecret,
    NODE_ENV: 'test',
    PROLIG_P1D_DB_NAME: TARGET,
    PROLIG_P1D_BROWSER_WRITES: allowWrites ? 'true' : 'false',
    DOTENV_CONFIG_PATH: PILOT
  };
}

const args = process.argv.slice(2);
const mode = args.length === 0 ? '--preflight' : args.length === 1 ? args[0] : 'invalid';
try {
  if (!['--preflight','--serve','--serve-write'].includes(mode)) {
    stop('Yalnızca --preflight, --serve veya --serve-write kullanılabilir.');
  }
  const allowWrites = mode === '--serve-write';
  if (allowWrites && process.env.PROLIG_P1D_BROWSER_UAT_APPROVAL !== APPROVAL) {
    stop('Tarayıcı yazma testi için ayrıca açık sandbox onayı gerekli.');
  }
  const config = prepare();
  await preflight(config.pilot.DIRECT_URL);
  await preflight(config.pilot.DATABASE_URL);
  console.log('PASS: İki Neon bağlantısı, sandbox kimliği ve pilot oturumları doğrulandı.');
  if (mode === '--preflight') {
    console.log('P1-D SANDBOX BROWSER PREFLIGHT: PASS — veri değiştirilmedi.');
  } else {
    const env = isolatedEnvironment(config, allowWrites);
    const child = spawn(process.execPath,
      ['--import','tsx','scripts/p1d-sandbox-browser-app.ts'], {
        cwd: process.cwd(), env, stdio: 'inherit', windowsHide: true
      }
    );
    child.on('error', () => {
      console.error('P1-D SANDBOX BROWSER: FAIL — yerel sunucu başlatılamadı.');
      process.exitCode = 1;
    });
    child.on('exit', (code) => { process.exitCode = code || 0; });
    process.on('SIGINT', () => { if (!child.killed) child.kill('SIGINT'); });
    console.log(allowWrites
      ? 'P1-D SANDBOX BROWSER: soru yazma testi etkin; yalnızca yapay pilot veri kullanın.'
      : 'P1-D SANDBOX BROWSER: salt okunur ekran önizlemesi; soru değişiklikleri engellendi.');
  }
} catch (error) {
  console.error('P1-D SANDBOX BROWSER: FAIL — ' +
    (error instanceof SafetyError ? error.message :
    'Bağlantı veya ortam denetimi beklenmedik hata verdi (' + (error?.code || 'UNKNOWN') + ').'));
  process.exitCode = 1;
}
