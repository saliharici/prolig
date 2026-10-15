#!/usr/bin/env node
/**
 * PRO-LIG P2 Acceptance Question Cleanup Script.
 * Strictly gated: deletes ONLY the single, explicitly approved disposable P2-UAT question
 * from the isolated prolig_p1d_sandbox Neon database.
 * NEVER alters production, unrelated questions, users, or projects.
 */
import { readFileSync, existsSync } from 'node:fs';
import dotenv from 'dotenv';
import pg from 'pg';

const PILOT_FILE = '.env.p1d.local';
const EXPECTED_DB = 'prolig_p1d_sandbox';
const EXPECTED_HOST_ROOT = 'ep-lingering-leaf-b9q3ohxd';
const ORIGINAL_FILES = ['.env', '.env.development.local'];
const APPROVAL_VAR = 'PROLIG_P2_CLEANUP_APPROVAL';
const EXPECTED_APPROVAL = 'ALLOW_P2_EXACT_QUESTION_CLEANUP_IN_prolig_p1d_sandbox';
const PILOT_AUTHOR_EMAIL = 'pilot.yazar@prolig.local';
const PILOT_PROJECT_CODE = 'PILOT-MAT-8-001';
const P2_UAT_MARKER = 'P2-UAT';

class CleanupError extends Error {}
const fail = msg => { throw new CleanupError(msg); };
const fileEnv = file => existsSync(file) ? dotenv.parse(readFileSync(file)) : null;
const hostRoot = url => url.hostname.toLowerCase().replace(/-pooler(?=\.)/, '');

function parseUrl(value, pooled) {
  let u;
  try { u = new URL(value); } catch { fail('Bağlantı adresi geçersiz.'); }
  if (!['postgres:', 'postgresql:'].includes(u.protocol) ||
      !u.hostname.toLowerCase().endsWith('.neon.tech') ||
      !u.username || !u.password ||
      u.pathname !== '/' + EXPECTED_DB ||
      u.hostname.includes('-pooler.') !== pooled) {
    fail('Sandbox bağlantısı beklenen biçimde değil.');
  }
  return u;
}

function verifySandboxEnvironment() {
  const pilot = fileEnv(PILOT_FILE);
  if (!pilot) fail('Ayrı pilot yapılandırma dosyası bulunamadı.');

  const pooled = parseUrl(pilot.DATABASE_URL, true);
  const direct = parseUrl(pilot.DIRECT_URL, false);
  if (hostRoot(pooled) !== hostRoot(direct) || pooled.username !== direct.username) {
    fail('Sandbox pooling ve direct adresleri birbiriyle eşleşmiyor.');
  }
  if (!hostRoot(direct).startsWith(EXPECTED_HOST_ROOT + '.')) {
    fail('Sandbox adresi beklenen bağımsız projeyle eşleşmiyor.');
  }

  const origHosts = [];
  for (const path of ORIGINAL_FILES) {
    const orig = fileEnv(path);
    if (!orig) continue;
    for (const name of ['DATABASE_URL', 'DIRECT_URL', 'POSTGRES_URL', 'POSTGRES_PRISMA_URL']) {
      if (!orig[name]) continue;
      try { origHosts.push(hostRoot(new URL(orig[name]))); } catch { fail('Mevcut ortam hostu çözümlenemedi.'); }
    }
  }
  if (!origHosts.length || origHosts.includes(hostRoot(direct))) {
    fail('Sandbox mevcut PRO-LIG canlı veritabanından bağımsız değil.');
  }

  return pilot;
}

async function runCleanup(questionId, apply = false) {
  if (!questionId || !Number.isSafeInteger(questionId) || questionId <= 0) {
    fail('Temizlenecek geçerli pozitif bir soru kimliği (--question-id <ID>) belirtilmelidir.');
  }

  if (apply) {
    const approval = process.env[APPROVAL_VAR];
    if (approval !== EXPECTED_APPROVAL) {
      fail(`P2 soru temizliği için onay eksik. Lütfen $env:${APPROVAL_VAR}="${EXPECTED_APPROVAL}" tanımlayın.`);
    }
  }

  const config = verifySandboxEnvironment();
  const client = new pg.Client({ connectionString: config.DIRECT_URL, connectionTimeoutMillis: 14000 });
  let inTx = false;

  try {
    await client.connect();

    // Validate identity
    const idCheck = await client.query('SELECT current_database() AS db');
    if (idCheck.rows[0]?.db !== EXPECTED_DB) {
      fail('Bağlanılan veritabanı hedef sandbox ile eşleşmiyor.');
    }

    // Inspect target question with ownership and marker joins
    const sql = `
      SELECT q.id, q.status, q."objectiveCode", q.content,
             u.email AS author_email, p.code AS project_code
      FROM public."Question" q
      LEFT JOIN public."User" u ON u.id = q."authorUserId"
      LEFT JOIN public."Project" p ON p.id = q."projectId"
      WHERE q.id = $1
    `;
    const res = await client.query(sql, [questionId]);
    if (res.rowCount === 0) {
      fail(`Soru #${questionId} bulunamadı.`);
    }

    const row = res.rows[0];
    if (row.author_email !== PILOT_AUTHOR_EMAIL) {
      fail(`Soru #${questionId} yapay pilot yazara ait değil (${row.author_email}). Silme reddedildi.`);
    }
    if (row.project_code !== PILOT_PROJECT_CODE) {
      fail(`Soru #${questionId} yetkili pilot projeye (${PILOT_PROJECT_CODE}) ait değil. Silme reddedildi.`);
    }
    const hasMarker = (row.objectiveCode && row.objectiveCode.includes(P2_UAT_MARKER)) ||
                      (row.content && row.content.includes(P2_UAT_MARKER));
    if (!hasMarker) {
      fail(`Soru #${questionId} üzerinde ${P2_UAT_MARKER} sahiplik işareti bulunmuyor. Silme reddedildi.`);
    }
    if (row.status !== 'TASLAK') {
      fail(`Soru #${questionId} TASLAK durumunda değil (${row.status}). Silme reddedildi.`);
    }

    // Inspect related QuestionAsset records
    const assetRes = await client.query(
      'SELECT id, "storageKey", "sortOrder" FROM public."QuestionAsset" WHERE "questionId" = $1 ORDER BY "sortOrder" ASC',
      [questionId]
    );

    // Inspect CompensationEntry: MUST NOT have compensation or payment records
    const compRes = await client.query(
      'SELECT id, amount, status FROM public."CompensationEntry" WHERE "questionId" = $1',
      [questionId]
    );
    if (compRes.rowCount > 0) {
      fail(`Soru #${questionId} ile ilişkili ${compRes.rowCount} adet hakediş/ödeme kaydı bulundu. Güvenlik gereği silme durduruldu.`);
    }

    // Inspect ActivityLog records belonging to this test question
    const logRes = await client.query(
      'SELECT id, "userName", action, "entityType", "entityId", details, "createdAt" ' +
      'FROM public."ActivityLog" WHERE "entityType" = \'Question\' AND "entityId" = $1 ORDER BY id ASC',
      [questionId]
    );

    if (!apply) {
      console.log('--- P2 SANDBOX CLEANUP (DRY-RUN) ---');
      console.log(`Hedef Soru: #${questionId}`);
      console.log(`Yazar: ${row.author_email}`);
      console.log(`Proje: ${row.project_code}`);
      console.log(`Durum: ${row.status}`);
      console.log(`İşaret: ${P2_UAT_MARKER} doğrulandı`);
      console.log(`İlişkili QuestionAsset: ${assetRes.rowCount} adet`);
      console.log(`İlişkili ActivityLog (Yapay test logları): ${logRes.rowCount} adet (${logRes.rows.map(r => r.action).join(', ') || 'Yok'})`);
      console.log(`Beklenmeyen Hakediş / Ödeme Kaydı: 0`);
      console.log('SONUÇ: DRY-RUN başarılı. Veritabanında hiçbir değişiklik YAPILMADI.');
      console.log(`Gerçek silme için: node scripts/p1d-p2-sandbox-cleanup.mjs --question-id ${questionId} --apply`);
      console.log(`(Zorunlu onay: $env:${APPROVAL_VAR}="${EXPECTED_APPROVAL}")`);
      return;
    }

    // APPLY MODE: atomic deletion
    await client.query('BEGIN');
    inTx = true;

    if (assetRes.rowCount > 0) {
      await client.query('DELETE FROM public."QuestionAsset" WHERE "questionId" = $1', [questionId]);
    }

    if (logRes.rowCount > 0) {
      await client.query(`DELETE FROM public."ActivityLog" WHERE "entityType" = 'Question' AND "entityId" = $1`, [questionId]);
    }

    const delRes = await client.query('DELETE FROM public."Question" WHERE id = $1', [questionId]);
    if (delRes.rowCount !== 1) {
      fail(`Soru #${questionId} silinemedi.`);
    }

    await client.query('COMMIT');
    inTx = false;

    // Post-cleanup read-only verification
    const verifyQuestion = await client.query('SELECT COUNT(*) AS count FROM public."Question" WHERE id = $1', [questionId]);
    const verifyAssets = await client.query('SELECT COUNT(*) AS count FROM public."QuestionAsset" WHERE "questionId" = $1', [questionId]);
    const verifyLogs = await client.query('SELECT COUNT(*) AS count FROM public."ActivityLog" WHERE "entityType" = \'Question\' AND "entityId" = $1', [questionId]);

    if (Number(verifyQuestion.rows[0]?.count) !== 0 ||
        Number(verifyAssets.rows[0]?.count) !== 0 ||
        Number(verifyLogs.rows[0]?.count) !== 0) {
      fail('Temizlik sonrası doğrulama başarısız: Artık kayıtlar tespit edildi.');
    }

    console.log(`PASS: Yapay P2 test sorusu #${questionId} ve ilişkili kayıtları (${assetRes.rowCount} varlık, ${logRes.rowCount} log) başarıyla temizlendi.`);
    console.log('Temizlik sonrası durum doğrulandı: 0 soru, 0 varlık, 0 test logu kaldı.');
  } catch (error) {
    if (inTx) await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

const args = process.argv.slice(2);
const qIdIndex = args.indexOf('--question-id');
const targetId = qIdIndex !== -1 && args[qIdIndex + 1] ? Number(args[qIdIndex + 1]) : null;
const apply = args.includes('--apply');

if (args.includes('--help') || !targetId) {
  console.log('Kullanım: node scripts/p1d-p2-sandbox-cleanup.mjs --question-id <SoruID> [--apply]');
  console.log('Varsayılan: Salt-okunur DRY-RUN incelemesi yapar, veritabanını DEĞİŞTİRMEZ.');
  console.log(`Gerçek silme için: --apply bayrağı ve ${APPROVAL_VAR}="${EXPECTED_APPROVAL}" gereklidir.`);
  if (!targetId && args.length > 0) process.exit(1);
  process.exit(0);
}

runCleanup(targetId, apply).catch(err => {
  console.error('P2 SANDBOX CLEANUP: FAIL — ' + (err instanceof CleanupError ? err.message : err.message || err));
  process.exit(1);
});
