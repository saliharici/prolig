#!/usr/bin/env node
/**
 * PRO-LIG P1-D sandbox-only one-time bootstrap.
 * Default --plan is READ ONLY. --apply requires independent explicit confirmation.
 * Never reads ordinary .env for connection credentials and never prints secrets.
 */
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';
import pg from 'pg';

const DB = 'prolig_p1d_sandbox';
const PILOT_FILE = '.env.p1d.local';
const CREDENTIALS = resolve('.local/p1d-sandbox-credentials.env');
const EXPECTED_MIGRATIONS = 7;
const ROLES = ['GENEL_KOORDINATOR','BOLGE_KOORDINATORU','IL_KOORDINATORU','EDITOR','YAZAR','MUHASEBE'];
const EMAILS = ['genel','bolge','il','editor','yazar','muhasebe'].map(role => 'pilot.' + role + '@prolig.local');
class Abort extends Error {}
const stop = message => { throw new Abort(message); };
const parseFile = file => existsSync(file) ? dotenv.parse(readFileSync(file)) : null;
const server = url => url.hostname.toLowerCase().replace(/-pooler(?=\.)/, '');

function checkedUrl(value, pooled) {
  let url;
  try { url = new URL(value); } catch { return stop('Sandbox URL biçimi hatalı veya eksik.'); }
  if (!['postgres:','postgresql:'].includes(url.protocol) ||
      !url.hostname.toLowerCase().endsWith('.neon.tech') ||
      url.pathname !== '/' + DB || !url.username || !url.password ||
      url.hostname.includes('-pooler.') !== pooled) {
    stop('Sandbox URL hedefi, veritabanı adı veya pooling türü hatalı.');
  }
  return url;
}

function credentials() {
  const p = parseFile(PILOT_FILE);
  if (!p) stop('Git tarafından yok sayılan .env.p1d.local bulunamadı.');
  if (p.PROLIG_P1D_DB_NAME !== DB ||
      p.PROLIG_PILOT_DB_CONFIRMED !== 'false' ||
      p.PROLIG_P1D_ALLOW_WRITES !== 'false') {
    stop('Sandbox dosyasındaki güvenlik bayrakları beklenen kapalı durumda değil.');
  }
  const pooled = checkedUrl(p.DATABASE_URL, true);
  const direct = checkedUrl(p.DIRECT_URL, false);
  if (server(pooled) !== server(direct) || pooled.username !== direct.username) {
    stop('Sandbox Pooling/Direct kaynakları farklı.');
  }
  const existing = [];
  for (const file of ['.env','.env.development.local']) {
    const original = parseFile(file);
    if (!original) continue;
    for (const key of ['DATABASE_URL','DIRECT_URL','POSTGRES_URL','POSTGRES_PRISMA_URL']) {
      if (!original[key]) continue;
      try { existing.push(server(new URL(original[key]))); }
      catch { stop('Mevcut veritabanı adresi güvenle karşılaştırılamadı.'); }
    }
  }
  if (existing.length === 0 || existing.includes(server(direct))) {
    stop('Sandbox mevcut PRO-LIG bağlantısından bağımsız olarak doğrulanamadı.');
  }
  return p;
}

async function inspect(url, expected) {
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 12000 });
  let inTx = false;
  try {
    await client.connect();
    await client.query('BEGIN READ ONLY');
    inTx = true;
    const result = await client.query([
      'SELECT current_database() AS db, current_schema() AS namespace,',
      "(SELECT COUNT(*)::int FROM pg_catalog.pg_class c",
      "JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace",
      "WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f')) AS objects,",
      "to_regclass('public.\"User\"') IS NOT NULL AS users,",
      "to_regclass('public.\"_prisma_migrations\"') IS NOT NULL AS migrations"
    ].join(' '));
    const state = result.rows[0];
    if (state?.db !== DB || state?.namespace !== 'public') stop('Bağlı veritabanı veya etkin şema yanlış.');
    if (expected === 'empty' && (state.objects !== 0 || state.users || state.migrations)) {
      stop('Sandbox artık boş değil. Durun; mevcut şemayı inceleyin.');
    }
    if (expected === 'migrated' && (!state.users || !state.migrations)) {
      stop('Sandbox migration sonrasında beklenen tablolar bulunamadı.');
    }
    if (expected === 'migrated') {
      const rows = await client.query(
        'SELECT migration_name, finished_at, rolled_back_at FROM public."_prisma_migrations"'
      );
      const names = migrationNames();
      if (rows.rowCount !== names.length ||
          rows.rows.some(x => !x.finished_at || x.rolled_back_at || !names.includes(x.migration_name))) {
        stop('Prisma migration geçmişi beklenen yedi başarılı sürümle eşleşmiyor.');
      }
    }
    let fixture = null;
    if (expected === 'seeded') {
      const users = await client.query('SELECT email FROM public."User"');
      const projects = await client.query('SELECT code FROM public."Project"');
      if (users.rowCount !== 6 ||
          users.rows.some(x => !EMAILS.includes(x.email)) ||
          projects.rowCount !== 1 || projects.rows[0]?.code !== 'PILOT-MAT-8-001') {
        stop('Sandbox pilot kullanıcı/proje kayıtları beklenenden farklı.');
      }
      fixture = { users: users.rowCount, projects: projects.rowCount };
    }
    await client.query('COMMIT');
    inTx = false;
    return { objects: state.objects, users: state.users, migrations: state.migrations, fixture };
  } catch (error) {
    if (inTx) await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

function migrationNames() {
  const dir = resolve('prisma/migrations');
  if (!existsSync(dir)) stop('Prisma migration klasörü bulunamadı.');
  const names = readdirSync(dir, { withFileTypes: true }).filter(x => x.isDirectory()).map(x => x.name).sort();
  if (names.length !== EXPECTED_MIGRATIONS ||
      !names.every(n => /^\d{14}_[a-z0-9_]+$/.test(n) &&
          existsSync(resolve(dir,n,'migration.sql')))) {
    stop('Beklenen yedi Prisma migration klasörü bulunamadı; kurulum durduruldu.');
  }
  return names;
}

function isolatedChildEnvironment(p) {
  // A minimal allowlist prevents accidentally propagating live DB or app secrets.
  const keys = ['PATH','Path','PATHEXT','SystemRoot','WINDIR','ComSpec','TEMP','TMP',
    'USERPROFILE','APPDATA','LOCALAPPDATA','HOME','HOMEDRIVE','HOMEPATH'];
  const env = {};
  for (const key of keys) if (process.env[key]) env[key] = process.env[key];
  return {
    ...env,
    DATABASE_URL: p.DATABASE_URL,
    DIRECT_URL: p.DIRECT_URL,
    PROLIG_PILOT_DB_CONFIRMED: 'true',
    PROLIG_ROTATE_PILOT_PASSWORDS: 'false',
    PROLIG_P1D_DB_NAME: DB,
    PROLIG_P1D_SANDBOX_ONLY: 'true',
    PROLIG_PILOT_CREDENTIALS_PATH: CREDENTIALS,
    NODE_ENV: 'test'
  };
}

function run(label, args, env) {
  // Hide untrusted raw subprocess output to avoid leaking connection details.
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(), env, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
    windowsHide: true, timeout: 180000
  });
  if (result.error || result.status !== 0) {
    stop(label + ' başarısız. Aşama durduruldu; çıkış kodu: ' +
      (Number.isInteger(result.status) ? result.status : 'PROCESS_ERROR'));
  }
  console.log('PASS: ' + label);
}

function createSandboxSecrets() {
  if (existsSync(CREDENTIALS)) stop('Sandbox kimlik bilgisi dosyası zaten var. Üzerine yazılmayacak.');
  mkdirSync(resolve('.local'), { recursive: true });
  const lines = ROLES.map(role => 'PILOT_' + role + '_PASSWORD=' + randomBytes(24).toString('hex'));
  lines.push('AUTH_SECRET=' + randomBytes(48).toString('hex'));
  writeFileSync(CREDENTIALS, lines.join('\n') + '\n', { flag: 'wx', mode: 0o600 });
  console.log('PASS: Ayrı sandbox test parolaları yerel gizli dosyada oluşturuldu.');
}

const args = process.argv.slice(2);
const mode = args.length === 0 ? '--plan' : args.length === 1 ? args[0] : 'invalid';
try {
  if (!['--plan','--apply'].includes(mode)) stop('Yalnızca --plan veya --apply kullanılabilir.');
  if (mode === '--apply' && process.env.PROLIG_P1D_APPLY_CONFIRM !== 'CREATE-prolig_p1d_sandbox') {
    stop('Yazma onayı eksik. PROLIG_P1D_APPLY_CONFIRM tam olarak CREATE-prolig_p1d_sandbox olmalı.');
  }
  const p = credentials();
  const migrations = migrationNames();
  const a = await inspect(p.DIRECT_URL, 'empty');
  const b = await inspect(p.DATABASE_URL, 'empty');
  if (JSON.stringify(a) !== JSON.stringify(b)) stop('Pooling ve Direct şemaları uyuşmuyor.');
  console.log('PASS: Bağımsız sandbox, iki bağlantı ve boş public şema doğrulandı.');
  console.log('PLAN: ' + migrations.length + ' Prisma migration, ' + ROLES.length +
    ' yapay kullanıcı, 1 matematik pilot projesi.');
  if (mode === '--plan') {
    console.log('P1-D SANDBOX BOOTSTRAP PLAN: PASS — HİÇBİR VERİ DEĞİŞMEDİ.');
  } else {
    const env = isolatedChildEnvironment(p);
    createSandboxSecrets();
    run('Prisma migrate deploy (yalnızca sandbox)',
      ['node_modules/prisma/build/index.js','migrate','deploy'], env);
    await inspect(p.DIRECT_URL, 'migrated');
    console.log('PASS: Yedi migration yeni sandbox veritabanında doğrulandı.');
    run('Prisma client generate (yerel)',
      ['node_modules/prisma/build/index.js','generate'], env);
    run('Altı yapay kullanıcı ve pilot proje seed',
      ['--import','tsx','prisma/seed.ts'], env);
    await inspect(p.DIRECT_URL, 'seeded');
    console.log('P1-D SANDBOX BOOTSTRAP: PASS — 6 yapay kullanıcı, 1 pilot proje.');
    console.log('Gizli kimlik bilgileri .local/p1d-sandbox-credentials.env dosyasında saklandı; paylaşmayın.');
  }
} catch (error) {
  const message = error instanceof Abort ? error.message :
    'Beklenmeyen bağlantı veya kurulum hatası (' + (error?.code || 'UNKNOWN') + ').';
  console.error('P1-D SANDBOX BOOTSTRAP: FAIL — ' + message);
  if (mode === '--apply') console.error('HATA SONRASI TEKRAR --apply ÇALIŞTIRMAYIN; önce şemayı inceleyin.');
  process.exitCode = 1;
}
