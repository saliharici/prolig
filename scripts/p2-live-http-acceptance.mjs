#!/usr/bin/env node
/**
 * Explicitly authorized, local-only real HTTP-handler ↔ isolated Neon P2 test.
 * The P2 branch identity preflight runs first and MUST succeed.
 * Credentials are loaded from a gitignored file, never printed or committed.
 */
import { existsSync, readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';

const envFile = '.env.p2-acceptance.local';
const fail = reason => { console.error('P2 live API acceptance blocked: ' + reason); process.exit(2); };
if (process.argv.length !== 3 || process.argv[2] !== '--run') {
  fail('Explicit --run argument is required. This script makes disposable writes on the isolated Neon branch.');
}
if (!existsSync(envFile)) fail('Missing gitignored .env.p2-acceptance.local.');
const vars = dotenv.parse(readFileSync(envFile));
if (!vars.DATABASE_URL) fail('Missing isolated acceptance DATABASE_URL.');

/* This independent read-only gate pins the exact acceptance endpoint, checks migration,
   fixture records, and refuses the main endpoint. Never bypass it on failure. */
const check = spawnSync(process.execPath, ['scripts/p2-acceptance-branch-check.mjs'], {
  stdio: 'inherit', env: { ...process.env, DATABASE_URL: '' }
});
if (check.error || check.status !== 0) fail('Read-only Neon branch verification failed; no write tests were started.');

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const test = spawnSync(command, ['vitest', 'run', 'tests/integration/p2-live-http-acceptance.test.ts'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    DATABASE_URL: vars.DATABASE_URL,
    // A fresh signing secret ONLY for the localhost test server. No pilot passwords are used.
    AUTH_SECRET: randomBytes(32).toString('hex'),
    PROLIG_QUESTION_TYPES_P2: 'true',
    PROLIG_P2_LIVE_WRITE_APPROVAL: 'P2_ACCEPTANCE_ONLY',
    NODE_ENV: 'test'
  }
});
if (test.error || test.status !== 0) {
  console.error('P2 live API test: FAIL — verify cleanup only on the isolated branch. No production connection is used.');
  process.exit(1);
}
console.log('P2 live API ↔ isolated Neon acceptance: PASS');
