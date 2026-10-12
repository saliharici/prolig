#!/usr/bin/env node
// P0 read-only application validation. This script never runs Prisma migrations,
// seeds data, or connects to a production database.
import { spawnSync } from 'node:child_process';

const checks = [
  ['TypeScript / lint', ['run', 'lint']],
  ['Focused permission scope regressions', ['exec', '--', 'vitest', 'run', 'tests/permission-scope-regression.test.ts', 'tests/question-workflow-id-contract.test.ts', 'tests/question-handlers.test.ts']],
  ['Build', ['run', 'build']]
];

let failures = 0;
for (const [name, args] of checks) {
  console.log('\n=== ' + name + ' ===');
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, PROLIG_PILOT_DB_CONFIRMED: 'false' }
  });
  if (result.error) {
    console.error(name + ' could not launch:', result.error.message);
    failures += 1;
  } else if (result.status !== 0) {
    failures += 1;
    console.error(name + ' failed with exit code', result.status);
  }
}
console.log('\nP0 local checks:', failures === 0 ? 'PASS' : 'FAIL (' + failures + ' stage(s))');
console.log('DB integration tests were not executed by this script.');
process.exitCode = failures === 0 ? 0 : 1;
