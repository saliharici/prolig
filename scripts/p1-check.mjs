#!/usr/bin/env node
// P1 read-only frontend acceptance gate: no database commands or migrations.
import { spawnSync } from 'node:child_process';

const jobs = [
  ['TypeScript / lint', ['run', 'lint']],
  ['P1 + full non-database regressions', ['exec', '--', 'vitest', 'run', '--exclude', 'tests/integration/**']],
  ['Production bundle compilation (no deployment)', ['run', 'build']]
];
let failed = 0;
for (const [label, args] of jobs) {
  console.log('\n=== ' + label + ' ===');
  const job = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      PROLIG_PILOT_DB_CONFIRMED: 'false',
      PROLIG_PILOT_FIXTURE_REPAIR: ''
    }
  });
  if (job.error || job.status !== 0) {
    failed++;
    console.error(label + ' failed:', job.error?.message || String(job.status));
  }
}
console.log('\nP1 frontend gate: ' + (failed === 0 ? 'PASS' : 'FAIL (' + failed + ' step(s))'));
console.log('This script does NOT run database integration, seed, migration or Vercel promotion.');
process.exitCode = failed === 0 ? 0 : 1;
