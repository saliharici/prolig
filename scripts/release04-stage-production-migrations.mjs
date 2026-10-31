/**
 * RELEASE-04: BUILD AN EXPLICIT, AUDITABLE PRODUCTION MIGRATION CANDIDATE.
 *
 * READ/LOCAL-FILE ONLY. This program never connects to a DB and never invokes
 * Prisma. It intentionally keeps the isolated P3 migration in its source folder
 * but excludes it from the independently staged Production candidate.
 *
 * GitHub issue #119. Historical sha256 values are from the read-only Neon
 * Production _prisma_migrations ledger, 2026-10-31. Failed-then-rolled-back
 * historical V2 entry has the same checksum as its successful retry.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const source = join(repo, 'prisma', 'migrations');
const output = join(repo, 'prisma', '.release04-production-migrations');
const historical = Object.freeze({
  '20261005225520_init_pilot': 'ba84937de335967f3ed034261abb61cd46a7493ffab5c254bbc09374923fd82f',
  '20261006224751_question_api_foundation': '9720a030a545b16749570cb5c5b85d47186137ff2cc01a1fc17aaeeffcf67082',
  '20261007204000_editor_branch_index': '4781a22bbf5b4c5392b04c1d6ffeebeabad3740302fd58ad91860c7bc23c42ac',
  '20261009013000_member_scope_management': 'd9fc6abcede246a4fcd0feed7db73deeae793b1237a4a93f5355e0e041c48f4f',
  '20261010190000_compensation_engine_foundation': 'bb043cde78b76c700bec6a27a80b21556fdbb7266e16a73e72c93ca13dd6b23a',
  '20261010210000_payment_period_settlement': '94ea63d7a6929b0922afbf9e741e3109b31d3e6873d19912d7980e012b1e5979',
  '20261011115000_question_media_assets': '878c22165dbabbba4d0133e8f631c7a1039c7ec3211b2729e4f5de8430a61111',
  '20261014120000_question_types': '4112cec12b452e92f5ec0c12bece5202fd0b4f3f93e2a94a9ee686d7af8a928b',
  '20261018221000_publishing_book_chapters_v2': '28a13e2809a14ac8bd4c6ba7915ef599ecc651af81003cc0d40dc27ec17d10da'
});
const pending = Object.freeze([
  '20261029010000_task_question_production_v3',
  '20261031010000_release04_expand_branch_coordinator_enum',
  '20261031011000_release04_seed_branch_coordinator_role'
]);
const forbidden = '20261021120000_p3_private_geometry_assets';
const approved = [...Object.keys(historical), ...pending];
const approvedSet = new Set(approved);
const folderEntries = readdirSync(source, { withFileTypes: true });
const present = folderEntries.filter(entry => entry.isDirectory()).map(entry => entry.name);
const otherDirs = present.filter(name => !approvedSet.has(name) && name !== forbidden);
const missingDirs = approved.filter(name => !present.includes(name));
if (otherDirs.length || missingDirs.length || !present.includes(forbidden)) {
  throw new Error('RELEASE04_MIGRATION_SOURCE_MANIFEST_MISMATCH: ' +
    JSON.stringify({ unexpectedCount: otherDirs.length, missingCount: missingDirs.length, p3Exists: present.includes(forbidden) }));
}
// One strict staging policy for CI and future controlled release preparation.
if (process.argv.length !== 2) throw new Error('RELEASE04_UNRECOGNIZED_MODE');
// Preserve bytes of executed SQL in the staged copy. Some historical files
// were applied from Windows CRLF files; GitHub stores the equivalent LF text.
// Never change the source or rewrite Prisma's Production ledger.
const sourceChecksums = {};
const checksums = {};
const historicalLineEndingRestorations = [];
const stagedSql = new Map();
for (const name of approved) {
  const sqlFile = join(source, name, 'migration.sql');
  if (!existsSync(sqlFile)) throw new Error('RELEASE04_MISSING_SQL: ' + name);
  const sourceBytes = readFileSync(sqlFile);
  const sourceSha = createHash('sha256').update(sourceBytes).digest('hex');
  sourceChecksums[name] = sourceSha;
  let installedBytes = sourceBytes;
  if (historical[name] && sourceSha !== historical[name]) {
    // Strictly allow one forensic recovery: same UTF-8 SQL with CRLF endings.
    // Its SHA-256 must EXACTLY match the immutable Production ledger checksum.
    const sourceText = sourceBytes.toString('utf8');
    const crlfBytes = Buffer.from(sourceText.replace(/\r\n|\n/g, '\r\n'), 'utf8');
    const crlfSha = createHash('sha256').update(crlfBytes).digest('hex');
    if (crlfSha !== historical[name]) {
      throw new Error('RELEASE04_PRODUCTION_LEDGER_DRIFT_NO_GO: ' + name);
    }
    installedBytes = crlfBytes;
    historicalLineEndingRestorations.push(name);
  }
  const stagedSha = createHash('sha256').update(installedBytes).digest('hex');
  if (historical[name] && stagedSha !== historical[name]) {
    throw new Error('RELEASE04_HISTORICAL_CHECKSUM_FAILURE: ' + name);
  }
  checksums[name] = stagedSha;
  stagedSql.set(name, installedBytes);
}
if (!existsSync(join(source, 'migration_lock.toml'))) throw new Error('RELEASE04_MISSING_MIGRATION_LOCK');
// All checks above finish BEFORE touching the reproducible ignored staging folder.
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
copyFileSync(join(source, 'migration_lock.toml'), join(output, 'migration_lock.toml'));
for (const name of approved) {
  mkdirSync(join(output, name));
  const stagedPath = join(output, name, 'migration.sql');
  writeFileSync(stagedPath, stagedSql.get(name));
  const onDiskSha = createHash('sha256').update(readFileSync(stagedPath)).digest('hex');
  if (onDiskSha !== checksums[name]) throw new Error('RELEASE04_STAGED_FILE_CHECKSUM_MISMATCH: ' + name);
}
if (existsSync(join(output, forbidden))) throw new Error('RELEASE04_P3_IN_PRODUCTION_CANDIDATE');
writeFileSync(join(output, 'RELEASE04_MANIFEST.json'), JSON.stringify({
  policy: 'RELEASE04_PRODUCTION_CANDIDATE_NO_P3',
  approved, historical: Object.keys(historical), pending,
  excluded: [forbidden], checksums, sourceChecksums,
  historicalChecksumCertified: true,
  historicalLineEndingRestorations,
  mode: 'PRODUCTION_CANDIDATE_STAGED_NOT_EXECUTED'
}, null, 2) + '\n');
console.log('RELEASE04_MIGRATION_STAGE_PASS: 9 historical + 3 pending; P3 omitted; historical staged bytes match Production ledger (9/9).');
console.log('Recovered historical CRLF bytes from unchanged GitHub source for ' + historicalLineEndingRestorations.length + ' migrations.');
console.log('NO database access, SQL execution, Production approval or deploy occurred.');
