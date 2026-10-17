#!/usr/bin/env node
/**
 * Single-ID, transaction-scoped cleanup of ONLY synthetic P2 editor revision-cycle questions.
 * DRY-RUN default, explicit separate approval required for --apply.
 * Never connects to Neon main, P1-D sandbox or production Vercel.
 */
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';
import pg from 'pg';

const PRIVATE_ENV = '.env.p2-acceptance.local';
const EXPECTED_HOST = 'ep-wild-sea-b2wlp46v.c-6.eu-central-1.aws.neon.tech';
const EXPECTED_DB = 'neondb';
const EXPECTED_MARKER = 'P2-UAT-REVISION-20261017';
const ALLOWED_STATUS = ['TASLAK','REVIZYON','INCELEMEDE'];
const ALLOWED_AUDIT = new Set(['QUESTION_CREATED','QUESTION_UPDATED','QUESTION_SUBMITTED','QUESTION_REVISION_REQUESTED']);
const EXPECTED_AUTHOR = 'pilot.yazar@prolig.local';
const EXPECTED_PROJECT = 'PILOT-MAT-8-001';
const CLEANUP_VAR = 'PROLIG_P2_BROWSER_REVISION_CLEANUP_APPROVAL';
const CLEANUP_APPROVAL = 'ALLOW_EXACT_MARKED_REVISION_CYCLE_CLEANUP_IN_ISOLATED_NEON_20261017';

function fail(reason) { throw new Error('P2 REVISION CLEANUP BLOCKED: ' + reason); }
const args = process.argv.slice(2);
const valid = (args.length === 2 && args[0] === '--question-id') ||
              (args.length === 3 && args[0] === '--question-id' && args[2] === '--apply');
if (!valid || !/^[1-9]\d*$/.test(args[1] || '')) {
  fail('Usage: node scripts/p2-browser-revision-cleanup.mjs --question-id <ID> [--apply]');
}
const questionId = Number(args[1]);
if (!Number.isSafeInteger(questionId)) fail('Invalid exact question ID.');
const apply = args.includes('--apply');
if (apply && process.env[CLEANUP_VAR] !== CLEANUP_APPROVAL) {
  fail('Independent cleanup approval is missing. No connection opened.');
}
if (!existsSync(PRIVATE_ENV)) fail('Missing private acceptance env file.');
const env = dotenv.parse(readFileSync(PRIVATE_ENV));
let parsed;
try { parsed = new URL(env.DATABASE_URL); } catch { fail('Invalid private Neon URL.'); }
if (!['postgres:', 'postgresql:'].includes(parsed.protocol) ||
    parsed.hostname.toLowerCase().replace(/-pooler(?=\.)/, '') !== EXPECTED_HOST ||
    parsed.pathname !== '/' + EXPECTED_DB || !parsed.password || !parsed.username) {
  fail('Only exact pinned P2 Neon acceptance branch may be inspected or modified.');
}

const check = spawnSync(process.execPath, ['scripts/p2-acceptance-branch-check.mjs'], {
  cwd: process.cwd(), stdio: 'inherit'
});
if (check.error || check.status !== 0) fail('Read-only acceptance branch preflight failed.');

const db = new pg.Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 14000 });
let inTx = false;
try {
  await db.connect();
  await db.query(apply ? 'BEGIN' : 'BEGIN READ ONLY');
  inTx = true;
  const result = await db.query(
    `SELECT q.id, q.status, q.grade, q."objectiveCode",
       u.email AS author_email, p.code AS project_code
       FROM public."Question" q
       JOIN public."User" u ON u.id=q."authorUserId"
       JOIN public."Project" p ON p.id=q."projectId"
       WHERE q.id=$1 ${apply ? 'FOR UPDATE OF q' : ''}`, [questionId]
  );
  const q = result.rows[0];
  if (!q || !ALLOWED_STATUS.includes(q.status) || q.grade !== '8. Sınıf' ||
      q.author_email !== EXPECTED_AUTHOR || q.project_code !== EXPECTED_PROJECT ||
      typeof q.objectiveCode !== 'string' ||
      !(q.objectiveCode === EXPECTED_MARKER || q.objectiveCode.startsWith(EXPECTED_MARKER + ' '))) {
    fail('Question does not match exact dedicated revision marker, owner, project, grade and accepted workflow state.');
  }
  // A pg.Client holds exactly one transaction; issue its queries sequentially.
  const assets = await db.query('SELECT count(*)::int AS n FROM public."QuestionAsset" WHERE "questionId"=$1', [questionId]);
  const compensation = await db.query('SELECT count(*)::int AS n FROM public."CompensationEntry" WHERE "questionId"=$1 OR "sourceKey"=ANY($2::text[])',
    [questionId, ['QUESTION_AUTHOR:' + questionId, 'QUESTION_EDITOR:' + questionId]]);
  const logs = await db.query(`SELECT action FROM public."ActivityLog"
              WHERE "entityType"='Question' AND "entityId"=$1 ORDER BY id`, [questionId]);
  const assetCount = assets.rows[0].n;
  const compensationCount = compensation.rows[0].n;
  const auditCount = logs.rowCount;
  if (!auditCount || auditCount > 12 || logs.rows.some(log => !ALLOWED_AUDIT.has(log.action))) {
    fail('Unexpected or missing revision-cycle audit actions. Manual review required; no rows deleted.');
  }
  if (assetCount !== 0 || compensationCount !== 0) {
    fail('Question has related media, compensation or payments; no cleanup permitted.');
  }
  if (!apply) {
    console.log('DRY-RUN PASS: synthetic Question #' + questionId +
      '; related audit logs ' + auditCount +
      '; current status ' + q.status + '; media/compensation 0. No rows changed.');
    await db.query('ROLLBACK');
    inTx = false;
  } else {
    await db.query(`DELETE FROM public."ActivityLog"
       WHERE "entityType"='Question' AND "entityId"=$1`, [questionId]);
    const deleted = await db.query(`DELETE FROM public."Question"
       WHERE id=$1 AND ("objectiveCode"=$2 OR "objectiveCode" LIKE $3) AND status=ANY($4::text[])`,
       [questionId, EXPECTED_MARKER, EXPECTED_MARKER + ' %', ALLOWED_STATUS]);
    if (deleted.rowCount !== 1) fail('Refusing cleanup because exact conditional delete failed.');
    await db.query('COMMIT');
    inTx = false;
    const remaining = await db.query('SELECT count(*)::int AS n FROM public."Question" WHERE id=$1', [questionId]);
    const remainingLogs = await db.query(`SELECT count(*)::int AS n FROM public."ActivityLog"
       WHERE "entityType"='Question' AND "entityId"=$1`, [questionId]);
    if (remaining.rows[0].n !== 0 || remainingLogs.rows[0].n !== 0) {
      fail('Post-delete verification failed; investigate the isolated branch.');
    }
    console.log('REVISION CLEANUP PASS: ONLY synthetic Question #' + questionId +
      ' and its ' + auditCount + ' audit logs removed from isolated Neon test branch.');
  }
} catch (error) {
  if (inTx) await db.query('ROLLBACK').catch(() => {});
  throw error;
} finally {
  await db.end().catch(() => {});
}
