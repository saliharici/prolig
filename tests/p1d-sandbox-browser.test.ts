import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const launcher = fs.readFileSync('scripts/p1d-sandbox-browser.mjs', 'utf8');
const server = fs.readFileSync('scripts/p1d-sandbox-browser-app.ts', 'utf8');

describe('P1-D isolated browser UAT safety', () => {
  it('refuses P2 write startup without its separate approval before connecting to a database', () => {
    const result = spawnSync(process.execPath, ['scripts/p1d-sandbox-browser.mjs', '--serve-p2-write'], {
      cwd: process.cwd(),
      env: { ...process.env, PROLIG_P2_BROWSER_UAT_APPROVAL: '' },
      encoding: 'utf8'
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('P2 soru kaydı yazma onayı');
    expect(result.stdout).not.toContain('Neon bağlantısı');
  });
  it('defaults to read-only preflight, and browser mutation requires independent approval', () => {
    expect(launcher).toContain("args.length === 0 ? '--preflight'");
    expect(launcher).toContain("mode === '--serve-write'");
    expect(launcher).toContain("PROLIG_P1D_BROWSER_UAT_APPROVAL !== APPROVAL");
    expect(launcher).toContain("ALLOW_BROWSER_QUESTION_WRITES_IN_prolig_p1d_sandbox");
    expect(server).toContain("const WRITES = process.env.PROLIG_P1D_BROWSER_WRITES === 'true'");
    expect(server).toContain('if (!WRITES) return res.status(403)');
  });

  it('enforces exact sandbox database, independent old Neon host and false original write flags', () => {
    expect(launcher).toContain("const PILOT = '.env.p1d.local'");
    expect(launcher).toContain("const PRIVATE = '.local/p1d-sandbox-credentials.env'");
    expect(launcher).toContain("const TARGET = 'prolig_p1d_sandbox'");
    expect(launcher).toContain("pilot.PROLIG_PILOT_DB_CONFIRMED !== 'false'");
    expect(launcher).toContain("pilot.PROLIG_P1D_ALLOW_WRITES !== 'false'");
    expect(launcher).toContain("existing.includes(endpoint(direct))");
    expect(launcher).toContain("u.pathname !== '/' + TARGET");
    expect(launcher).toContain("await preflight(config.pilot.DIRECT_URL)");
    expect(launcher).toContain("await preflight(config.pilot.DATABASE_URL)");
    expect(launcher).toContain("await client.query('BEGIN READ ONLY')");
  });

  it('passes only dedicated secrets to a fresh environment and never invokes Vercel CLI', () => {
    expect(launcher).toContain("DATABASE_URL: config.pilot.DATABASE_URL");
    expect(launcher).toContain("DIRECT_URL: config.pilot.DIRECT_URL");
    expect(launcher).toContain("AUTH_SECRET: config.authSecret");
    expect(launcher).toContain("NODE_ENV: 'test'");
    expect(launcher).toContain("['--import','tsx','scripts/p1d-sandbox-browser-app.ts']");
    expect(launcher).not.toContain('...process.env');
    expect(launcher).not.toContain('env: process.env');
    expect(launcher).not.toContain('vercel dev');
    expect(server).not.toContain('vercel dev');
  });

  it('binds only to localhost and blocks cross-origin requests', () => {
    expect(server).toContain("const PORT = 3137");
    expect(server).toContain("const ORIGIN = 'http://127.0.0.1:' + PORT");
    expect(server).toContain("httpServer.listen(PORT, '127.0.0.1'");
    expect(server).toContain("host !== '127.0.0.1:' + PORT");
    expect(server).toContain("if (origin && origin !== ORIGIN)");
  });

  it('blocks secret file serving and restricts API to P1-D auth, question and project reads', () => {
    expect(server).toContain('configFile: false');
    expect(server).toContain('envDir: false');
    expect(server).toContain("'import.meta.env.VITE_QUESTION_STUDIO_P1': JSON.stringify('true')");
    expect(server).toContain("'import.meta.env.VITE_QUESTION_STUDIO_P1C': JSON.stringify('true')");
    expect(server).toContain("deny: [");
    expect(server).toContain("'**/.local/**'");
    expect(server).toContain("'**/.env*'");
    expect(server).toContain("app.get('/api/v1/questions', adapt(questions))");
    expect(server).toContain("app.get('/api/v1/projects', adapt(projects))");
    expect(server).toContain("app.post('/api/v1/questions', mutationOnly, adapt(questions))");
    expect(server).toContain("app.patch('/api/v1/questions/:id', withId, mutationOnly, adapt(questionId))");
    expect(server).toContain("app.post('/api/v1/questions/:id/workflow', withId, mutationOnly, adapt(workflow))");
    expect(server).toContain("app.use('/api/', (_req, res) => res.status(404)");
    expect(server).not.toContain("app.use('/api/', adapt");
    expect(server).not.toContain("app.get('/api/v1/questions/:id'");
  });

  it('supports explicit --serve-p2 mode while enforcing read-only isolation', () => {
    expect(launcher).toContain("'--serve-p2'");
    expect(launcher).toContain("const isP2ReadOnly = mode === '--serve-p2'");
    expect(launcher).toContain("VITE_QUESTION_STUDIO_P2_EDITOR: p2Editor ? 'true' : 'false'");
    expect(launcher).toContain("const allowWrites = isP1DWrite || isP2Write");
    expect(server).toContain("const P2_EDITOR = process.env.VITE_QUESTION_STUDIO_P2_EDITOR === 'true'");
    expect(server).toContain("'import.meta.env.VITE_QUESTION_STUDIO_P2_EDITOR': JSON.stringify(P2_EDITOR ? 'true' : 'false')");
    expect(launcher).toContain("PROLIG_QUESTION_TYPES_P2: 'false'");
    expect(launcher).toContain("VITE_QUESTION_STUDIO_P2_TYPES: p2Editor && (!allowWrites || isP2Write) ? 'true' : 'false'");
    expect(server).toContain("const P2_TYPES_UI_PREVIEW = P2_EDITOR && (!WRITES || P2_GUARDED_WRITES) && process.env.VITE_QUESTION_STUDIO_P2_TYPES === 'true'");
    expect(server).toContain("'import.meta.env.VITE_QUESTION_STUDIO_P2_TYPES': JSON.stringify(P2_TYPES_UI_PREVIEW ? 'true' : 'false')");
  });

  it('strictly gates --serve-p2-write with dedicated approval, host check and runtime guards', () => {
    expect(launcher).toContain("'--serve-p2-write'");
    expect(launcher).toContain("const P2_WRITE_APPROVAL = 'ALLOW_P2_BROWSER_QUESTION_WRITES_IN_prolig_p1d_sandbox'");
    expect(launcher).toContain("process.env.PROLIG_P2_BROWSER_UAT_APPROVAL !== P2_WRITE_APPROVAL");
    expect(launcher).toContain("PROLIG_P2_GUARDED_WRITES: isP2Write ? 'true' : 'false'");
    expect(launcher).toContain("const EXPECTED_SANDBOX_HOST_ROOT = 'ep-lingering-leaf-b9q3ohxd'");

    // Server runtime guards
    expect(server).toContain("const P2_GUARDED_WRITES = process.env.PROLIG_P2_GUARDED_WRITES === 'true'");
    expect(server).toContain("const PILOT_AUTHOR_EMAIL = 'pilot.yazar@prolig.local'");
    expect(server).toContain("const PILOT_PROJECT_CODE = 'PILOT-MAT-8-001'");
    expect(server).toContain("const P2_UAT_MARKER = 'P2-UAT'");
    expect(server).toContain("if (req.path && req.path.includes('/workflow'))");
    expect(server).toContain("if (req.method === 'DELETE')");
    expect(server).toContain("if (existing.status !== 'TASLAK')");
    expect(server).toContain("if (P2_GUARDED_WRITES)");
  });

  it('provides dedicated single-question cleanup script enforcing host, approval and safety guards', () => {
    const cleanup = fs.readFileSync('scripts/p1d-p2-sandbox-cleanup.mjs', 'utf8');
    expect(cleanup).toContain("const EXPECTED_DB = 'prolig_p1d_sandbox'");
    expect(cleanup).toContain("const EXPECTED_HOST_ROOT = 'ep-lingering-leaf-b9q3ohxd'");
    expect(cleanup).toContain("const APPROVAL_VAR = 'PROLIG_P2_CLEANUP_APPROVAL'");
    expect(cleanup).toContain("const EXPECTED_APPROVAL = 'ALLOW_P2_EXACT_QUESTION_CLEANUP_IN_prolig_p1d_sandbox'");
    expect(cleanup).toContain("const PILOT_AUTHOR_EMAIL = 'pilot.yazar@prolig.local'");
    expect(cleanup).toContain("const PILOT_PROJECT_CODE = 'PILOT-MAT-8-001'");
    expect(cleanup).toContain("const P2_UAT_MARKER = 'P2-UAT'");
    expect(cleanup).toContain("row.status !== 'TASLAK'");
    expect(cleanup).toContain("DELETE FROM public.\"QuestionAsset\" WHERE \"questionId\" = $1");
    expect(cleanup).toContain("DELETE FROM public.\"Question\" WHERE id = $1");
    expect(cleanup).toContain("DRY-RUN");
    expect(cleanup).toContain("CompensationEntry");
    expect(cleanup).toContain("DELETE FROM public.\"ActivityLog\" WHERE \"entityType\" = 'Question' AND \"entityId\" = $1");
    expect(cleanup).toContain("SELECT COUNT(*) AS count FROM public.\"Question\" WHERE id = $1");
  });
});
