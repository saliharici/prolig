#!/usr/bin/env node
// PRO-LIG P1-D sandbox ONLY: identity and empty-schema inspection.
// NEVER migrates, seeds, changes roles, or modifies stored rows.
// Reads credentials solely from the dedicated Git-ignored pilot file.
import { readFileSync, existsSync } from 'node:fs';
import dotenv from 'dotenv';
import pg from 'pg';

const PILOT_FILE = '.env.p1d.local';
const ORIGINAL_FILES = ['.env', '.env.development.local'];
const EXPECTED_DB = 'prolig_p1d_sandbox';
class SafetyError extends Error {}
const reject = message => { throw new SafetyError(message); };
const fileEnv = file => existsSync(file) ? dotenv.parse(readFileSync(file)) : null;
const hostRoot = url => url.hostname.toLowerCase().replace(/-pooler(?=\.)/, '');

function parsePilotUrl(value, pooled) {
  if (typeof value !== 'string' || !value.trim() || value.includes('BURAYA_')) {
    return reject('Pilot bağlantısı tanımlı değil.');
  }
  let url;
  try { url = new URL(value); } catch { return reject('Pilot bağlantısının biçimi hatalı.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
      !url.hostname.toLowerCase().endsWith('.neon.tech') ||
      !url.username || !url.password || url.pathname !== '/' + EXPECTED_DB) {
    return reject('Pilot bağlantısı beklenen Neon veritabanını göstermiyor.');
  }
  if (url.hostname.includes('-pooler.') !== pooled) {
    return reject('Pooling / direct adresleri karışmış.');
  }
  return url;
}

async function inspect(connectionString, label) {
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 12000 });
  let transactionOpen = false;
  try {
    await client.connect();
    await client.query('BEGIN READ ONLY');
    transactionOpen = true;
    const sql = [
      'SELECT current_database() AS db, current_schema() AS active_schema,',
      '(SELECT COUNT(*)::int FROM information_schema.tables',
      "WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS table_count,",
      "to_regclass('public.\"User\"') IS NOT NULL AS has_users_table,",
      "to_regclass('public.\"_prisma_migrations\"') IS NOT NULL AS has_migrations_table"
    ].join(' ');
    const result = await client.query(sql);
    await client.query('COMMIT');
    transactionOpen = false;
    const state = result.rows[0];
    if (state?.db !== EXPECTED_DB || state?.active_schema !== 'public') {
      return reject('Veritabanı kimliği veya şeması beklenenden farklı.');
    }
    console.log('PASS: ' + label + ' bağlantısı pilot veritabanında salt okunur çalışıyor.');
    return {
      tables: state.table_count,
      hasUsers: state.has_users_table,
      hasMigrations: state.has_migrations_table
    };
  } catch (error) {
    if (transactionOpen) await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

try {
  const pilot = fileEnv(PILOT_FILE);
  if (!pilot) reject('Ayrı .env.p1d.local dosyası bulunamadı.');
  if (pilot.PROLIG_P1D_DB_NAME !== EXPECTED_DB ||
      pilot.PROLIG_PILOT_DB_CONFIRMED !== 'false' ||
      pilot.PROLIG_P1D_ALLOW_WRITES !== 'false') {
    reject('Pilot güvenlik bayrakları beklenen kilitli durumda değil.');
  }

  const pooled = parsePilotUrl(pilot.DATABASE_URL, true);
  const direct = parsePilotUrl(pilot.DIRECT_URL, false);
  if (hostRoot(pooled) !== hostRoot(direct)) reject('İki pilot adresi farklı sunucuları gösteriyor.');
  if (pooled.username !== direct.username) reject('Pilot bağlantılarının veritabanı rolleri farklı.');

  const originalHostRoots = ORIGINAL_FILES.flatMap(file => {
    const e = fileEnv(file);
    if (!e) return [];
    return ['DATABASE_URL', 'DIRECT_URL', 'POSTGRES_URL', 'POSTGRES_PRISMA_URL']
      .flatMap(key => {
        if (!e[key]) return [];
        try { return [hostRoot(new URL(e[key]))]; }
        catch { return reject('Mevcut ortamın veritabanı bağlantısı doğrulanamadı.'); }
      });
  });
  if (!originalHostRoots.length) reject('Mevcut ortamla karşılaştırma yapılamadı.');
  if (originalHostRoots.includes(hostRoot(direct))) {
    reject('Pilot bağlantısı mevcut PRO-LIG veritabanı sunucusuyla aynı.');
  }

  console.log('PASS: Pilot hedef mevcut yerel PRO-LIG sunucusundan farklı.');
  const a = await inspect(pilot.DATABASE_URL, 'Pooled');
  const b = await inspect(pilot.DIRECT_URL, 'Direct');
  if (JSON.stringify(a) !== JSON.stringify(b)) reject('İki bağlantının şema durumu farklı.');
  console.log('Pilot public tablo sayısı: ' + a.tables);
  console.log('Prisma migration tablosu: ' + (a.hasMigrations ? 'VAR' : 'YOK'));
  console.log('User tablosu: ' + (a.hasUsers ? 'VAR' : 'YOK'));
  if (a.tables !== 0 || a.hasMigrations || a.hasUsers) {
    console.log('NOT: Pilot veritabanı boş değil; yazma işlemi planlamadan önce ayrıca inceleyin.');
  } else {
    console.log('PASS: Yeni pilot public şeması boş görünüyor.');
  }
  console.log('P1-D SANDBOX READ-ONLY INSPECTION: PASS — veri değiştirilmedi.');
} catch (error) {
  // Never print database URL, password, or arbitrary connection error text.
  const reason = error instanceof SafetyError ? error.message :
    'Bağlantı veya beklenmeyen güvenlik denetimi hatası (' + (error?.code || 'UNKNOWN') + ')';
  console.error('P1-D SANDBOX READ-ONLY INSPECTION: FAIL — ' + reason);
  process.exitCode = 1;
}
