#!/usr/bin/env node
/**
 * PRO-LIG P1-D post-bootstrap acceptance check. Strictly READ ONLY.
 * Only reads .env.p1d.local; never uses process.env for DB connection credentials.
 * Do not paste secret files or connection URLs into chat.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import dotenv from 'dotenv';
import pg from 'pg';

const EXPECTED_DB = 'prolig_p1d_sandbox';
const PILOT_FILE = '.env.p1d.local';
const ORIGINAL_FILES = ['.env', '.env.development.local'];
const PILOT_ACCOUNTS = new Map([
  ['pilot.genel@prolig.local','GENEL_KOORDINATOR'],
  ['pilot.bolge@prolig.local','BOLGE_KOORDINATORU'],
  ['pilot.il@prolig.local','IL_KOORDINATORU'],
  ['pilot.editor@prolig.local','EDITOR'],
  ['pilot.yazar@prolig.local','YAZAR'],
  ['pilot.muhasebe@prolig.local','MUHASEBE']
]);
class GuardError extends Error {}
const stop = reason => { throw new GuardError(reason); };
const parseEnvFile = name => existsSync(name) ? dotenv.parse(readFileSync(name)) : null;
const normalizedHost = u => u.hostname.toLowerCase().replace(/-pooler(?=\.)/, '');

function connectionUrl(value, pooled) {
  let url;
  try { url = new URL(value); } catch { stop('Pilot bağlantı adresi okunamıyor.'); }
  if (!['postgres:','postgresql:'].includes(url.protocol) ||
      !url.hostname.toLowerCase().endsWith('.neon.tech') ||
      !url.username || !url.password ||
      url.pathname !== '/' + EXPECTED_DB ||
      url.hostname.includes('-pooler.') !== pooled) {
    stop('Pilot bağlantısının hedefi veya pooling modu uygun değil.');
  }
  return url;
}

function validateLocalIsolation() {
  const pilot = parseEnvFile(PILOT_FILE);
  if (!pilot) stop('Bağımsız .env.p1d.local dosyası bulunamadı.');
  if (pilot.PROLIG_P1D_DB_NAME !== EXPECTED_DB ||
      pilot.PROLIG_PILOT_DB_CONFIRMED !== 'false' ||
      pilot.PROLIG_P1D_ALLOW_WRITES !== 'false') {
    stop('Pilot güvenlik bayrakları değiştirilmiş; inceleme reddedildi.');
  }
  const pooled = connectionUrl(pilot.DATABASE_URL, true);
  const direct = connectionUrl(pilot.DIRECT_URL, false);
  if (normalizedHost(pooled) !== normalizedHost(direct) ||
      pooled.username !== direct.username) stop('Pilot bağlantı adresleri tutarsız.');
  const oldHosts = [];
  for (const filename of ORIGINAL_FILES) {
    const env = parseEnvFile(filename);
    if (!env) continue;
    for (const name of ['DATABASE_URL','DIRECT_URL','POSTGRES_URL','POSTGRES_PRISMA_URL']) {
      if (!env[name]) continue;
      try { oldHosts.push(normalizedHost(new URL(env[name]))); }
      catch { stop('Mevcut sistem bağlantısı doğrulanamıyor.'); }
    }
  }
  if (!oldHosts.length || oldHosts.includes(normalizedHost(direct))) {
    stop('Yeni sandbox eski yerel Neon sunucusundan ayrı olarak doğrulanamadı.');
  }
  return pilot;
}

const expectedMigrations = () => {
  const dir = 'prisma/migrations';
  if (!existsSync(dir)) stop('Prisma migrations klasörü eksik.');
  const names = readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name).sort();
  if (names.length !== 7 || !names.every(n => /^\d{14}_[a-z0-9_]+$/.test(n) &&
      existsSync(dir + '/' + n + '/migration.sql'))) {
    stop('Beklenen 7 kaynak migration bulunamadı.');
  }
  return names;
};

async function readOnly(url, fn) {
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 15000 });
  let inTx = false;
  try {
    await client.connect();
    await client.query('BEGIN READ ONLY');
    inTx = true;
    const identity = await client.query('SELECT current_database() AS db, current_schema() AS namespace');
    if (identity.rows[0]?.db !== EXPECTED_DB || identity.rows[0]?.namespace !== 'public') {
      stop('Veritabanı kimliği veya etkin şema yanlış.');
    }
    const data = await fn(client);
    await client.query('COMMIT');
    inTx = false;
    return data;
  } catch (error) {
    if (inTx) await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

const exactly = (result, count, name) => {
  if (result.rowCount !== count) stop(name + ' sayısı beklenenden farklı.');
  return result.rows;
};

try {
  const pilot = validateLocalIsolation();
  const expected = expectedMigrations();
  await readOnly(pilot.DATABASE_URL, async c => {
    const table = await c.query("SELECT to_regclass('public.\"User\"') IS NOT NULL AS users, to_regclass('public.\"_prisma_migrations\"') IS NOT NULL AS migrations");
    if (!table.rows[0]?.users || !table.rows[0]?.migrations) stop('Sandbox şema tabloları eksik.');
  });
  console.log('PASS: Bağımsız sandbox ve pooled/direct veritabanı kimliği doğrulandı.');

  await readOnly(pilot.DIRECT_URL, async c => {
    const migrations = exactly(await c.query(
      'SELECT migration_name, finished_at, rolled_back_at FROM public."_prisma_migrations"'
    ), expected.length, 'Migration');
    if (migrations.some(m => !expected.includes(m.migration_name) || !m.finished_at || m.rolled_back_at)) {
      stop('Prisma migration sürümleri eksik, başarısız veya beklenmedik.');
    }
    console.log('PASS: 7/7 Prisma migration başarıyla kayıtlı.');

    const roles = exactly(await c.query('SELECT code FROM public."Role"'), 6, 'Rol');
    if (roles.some(r => ![...PILOT_ACCOUNTS.values()].includes(r.code))) stop('Pilot rol kodları hatalı.');
    const users = exactly(await c.query(
      'SELECT u.id, u.email, u.status, u."passwordHash" IS NOT NULL AS has_password, ' +
      'u."editorBranchId", u."editorGrade", u."assignedRegion", u."provinceId", r.code AS role_code ' +
      'FROM public."User" u JOIN public."Role" r ON r.id = u."roleId"'
    ), PILOT_ACCOUNTS.size, 'Pilot kullanıcı');
    const usersByEmail = new Map(users.map(u => [u.email,u]));
    for (const [email, role] of PILOT_ACCOUNTS) {
      const u = usersByEmail.get(email);
      if (!u || u.role_code !== role || u.status !== 'Aktif' || !u.has_password) {
        stop('Pilot kullanıcı rolü/durumu/parola hash varlığı hatalı.');
      }
    }
    console.log('PASS: 6/6 yapay kullanıcı ve altı rol doğru.');

    const author = exactly(await c.query(
      'SELECT a.id AS profile_id, a."branchId" AS branch_id, a."provinceId" AS province_id, ' +
      'b.name AS branch_name, p.code AS province_code, p.region AS region ' +
      'FROM public."AuthorProfile" a ' +
      'JOIN public."User" u ON u.id = a."userId" ' +
      'JOIN public."Branch" b ON b.id = a."branchId" ' +
      'JOIN public."Province" p ON p.id = a."provinceId" ' +
      "WHERE u.email = 'pilot.yazar@prolig.local'"
    ), 1, 'Yazar profili')[0];
    if (author.branch_name !== 'Matematik' ||
        author.province_code !== '34' || author.region !== 'Marmara') {
      stop('Yazar branş veya coğrafi kapsamı hatalı.');
    }
    const editor = usersByEmail.get('pilot.editor@prolig.local');
    const coordinator = usersByEmail.get('pilot.il@prolig.local');
    if (editor.editorBranchId !== author.branch_id ||
        editor.editorGrade !== '8. Sınıf' ||
        (editor.provinceId !== author.province_id && editor.assignedRegion !== author.region) ||
        coordinator.provinceId !== author.province_id) {
      stop('Editör/yazar/il koordinatörü kapsam bağlantısı uyuşmuyor.');
    }
    const assignment = await c.query(
      'SELECT id FROM public."UserBranchAssignment" WHERE "userId" = $1 AND "branchId" = $2',
      [editor.id,author.branch_id]
    );
    exactly(assignment,1,'Editör branş ataması');
    console.log('PASS: Yazar profili, editör ve il koordinatörü kapsamları uyumlu.');

    const projects = exactly(await c.query(
      'SELECT p.id, p.code, p."targetGrade", p."branchId", b.name AS branch_name ' +
      'FROM public."Project" p JOIN public."Branch" b ON b.id = p."branchId"'
    ), 1, 'Pilot proje');
    const project = projects[0];
    if (project.code !== 'PILOT-MAT-8-001' ||
        project.targetGrade !== '8. Sınıf' ||
        project.branchId !== author.branch_id ||
        project.branch_name !== 'Matematik') {
      stop('Pilot matematik projesi beklenen özelliklere sahip değil.');
    }
    const relation = await c.query(
      'SELECT "roleInProject" FROM public."ProjectAuthor" WHERE "projectId" = $1 AND "authorProfileId" = $2',
      [project.id,author.profile_id]
    );
    if (relation.rowCount !== 1 || relation.rows[0].roleInProject !== 'Yazar') {
      stop('Pilot proje-yazar ilişkisi yanlış.');
    }
    console.log('PASS: Matematik pilot projesi ve yazar ataması doğru.');
  });
  console.log('P1-D SANDBOX POST-BOOTSTRAP VERIFY: PASS — sadece okuma; veri değiştirilmedi.');
} catch (error) {
  const message = error instanceof GuardError ? error.message :
    'Bağlantı veya sorgu hatası (' + (error?.code || 'UNKNOWN') + ').';
  console.error('P1-D SANDBOX POST-BOOTSTRAP VERIFY: FAIL — ' + message);
  process.exitCode = 1;
}
