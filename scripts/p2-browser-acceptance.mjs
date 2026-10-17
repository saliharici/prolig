#!/usr/bin/env node
/**
 * P2 isolated Neon browser UAT, read-only until a separately reviewed write stage.
 * No Vercel CLI, original env files, stored passwords, seed, migration, or DB writes.
 */
import { existsSync, readFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import dotenv from 'dotenv';

const PRIVATE_ENV = '.env.p2-acceptance.local';
const ACCEPTANCE_HOST = 'ep-wild-sea-b2wlp46v.c-6.eu-central-1.aws.neon.tech';
const MAIN_HOST = 'ep-aged-rice-b21dkfno.c-6.eu-central-1.aws.neon.tech';
const ACCEPTANCE_DB = 'neondb';
const mode = process.argv.length === 3 ? process.argv[2] : '--preflight';
const fail = reason => { throw new Error('P2 BROWSER UAT BLOCKED: ' + reason); };

function safeDatabaseUrl(connection) {
  let u;
  try { u = new URL(connection); } catch { fail('Private acceptance database URL missing or malformed.'); }
  const host = u.hostname.toLowerCase().replace(/-pooler(?=\.)/, '');
  if (!['postgres:', 'postgresql:'].includes(u.protocol) || !u.username || !u.password ||
      u.pathname !== '/' + ACCEPTANCE_DB || host !== ACCEPTANCE_HOST || host === MAIN_HOST) {
    fail('Database must be the exact pinned independent P2 acceptance branch.');
  }
}

function childEnvironment(connection) {
  // Filter out real Vercel, application, and operator credentials from process.env.
  const clean = {};
  for (const name of ['PATH','Path','PATHEXT','SystemRoot','WINDIR','ComSpec',
    'TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','HOME','HOMEDRIVE','HOMEPATH']) {
    if (process.env[name]) clean[name] = process.env[name];
  }
  return {
    ...clean, DATABASE_URL: connection, AUTH_SECRET: randomBytes(48).toString('hex'),
    NODE_ENV: 'test', PROLIG_QUESTION_TYPES_P2: 'true',
    PROLIG_P2_BROWSER_READONLY: 'P2_ACCEPTANCE_READONLY_ONLY'
  };
}

try {
  if (!['--preflight','--serve'].includes(mode)) fail('Only --preflight and --serve supported. Writes are disabled.');
  if (!existsSync(PRIVATE_ENV)) fail('Gitignored .env.p2-acceptance.local not found.');
  const parsed = dotenv.parse(readFileSync(PRIVATE_ENV));
  safeDatabaseUrl(parsed.DATABASE_URL);
  // Rerun the existing exhaustive read-only branch+fixture/migration safety check.
  const safety = spawnSync(process.execPath, ['scripts/p2-acceptance-branch-check.mjs'], {
    cwd: process.cwd(), stdio: 'inherit',
    env: Object.fromEntries(Object.entries(process.env).filter(([key]) =>
      !/^(DATABASE_URL|DIRECT_URL|AUTH_SECRET|VERCEL_|POSTGRES_|PROLIG_QUESTION_TYPES_P2)/.test(key)))
  });
  if (safety.error || safety.status !== 0) fail('P2 isolated Neon read-only preflight failed.');
  if (mode === '--preflight') {
    console.log('P2 BROWSER UAT PREFLIGHT: PASS — READ ONLY, no data changed.');
  } else {
    const child = spawn(process.execPath, ['--import','tsx','scripts/p2-browser-acceptance-app.ts'], {
      cwd: process.cwd(), env: childEnvironment(parsed.DATABASE_URL), stdio: 'inherit', windowsHide: true
    });
    child.on('error', () => {
      console.error('P2 BROWSER UAT: local preview could not launch.');
      process.exitCode = 1;
    });
    child.on('exit', code => { process.exitCode = code || 0; });
    process.on('SIGINT', () => { if (!child.killed) child.kill('SIGINT'); });
    console.log('P2 browser preview launching on loopback only; all question mutations BLOCKED.');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'P2 browser UAT blocked.');
  process.exitCode = 2;
}
