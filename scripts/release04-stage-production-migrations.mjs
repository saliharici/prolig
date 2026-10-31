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
const checksums = {};
for (const name of approved) {
  const sqlFile = join(source, name, 'migration.sql');
  if (!existsSync(sqlFile)) throw new Error('RELEASE04_MISSING_SQL: ' + name);
  const content = readFileSync(sqlFile);
  const sha = createHash('sha256').update(content).digest('hex');
  if (historical[name] && sha !== historical[name])
    throw new Error('RELEASE04_HISTORICAL_CHECKSUM_MISMATCH: ' + name);
  checksums[name] = sha;
}
if (!existsSync(join(source, 'migration_lock.toml'))) throw new Error('RELEASE04_MISSING_MIGRATION_LOCK');
// All checks above finish BEFORE touching the reproducible ignored staging folder.
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
copyFileSync(join(source, 'migration_lock.toml'), join(output, 'migration_lock.toml'));
for (const name of approved) {
  mkdirSync(join(output, name));
  copyFileSync(join(source, name, 'migration.sql'), join(output, name, 'migration.sql'));
}
if (existsSync(join(output, forbidden))) throw new Error('RELEASE04_P3_IN_PRODUCTION_CANDIDATE');
writeFileSync(join(output, 'RELEASE04_MANIFEST.json'), JSON.stringify({
  policy: 'RELEASE04_PRODUCTION_CANDIDATE_NO_P3',
  approved, historical: Object.keys(historical), pending,
  excluded: [forbidden], checksums
}, null, 2) + '\n');
console.log('RELEASE04_PRODUCTION_MIGRATION_STAGE_PASS: 9 historical + 3 pending; P3 omitted; historical checksums pinned.');
console.log('This is local staging only: NO database read or write; NO Production approval or migration execution.');
