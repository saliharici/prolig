import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const launcher = fs.readFileSync('scripts/p1d-sandbox-browser.mjs', 'utf8');
const server = fs.readFileSync('scripts/p1d-sandbox-browser-app.ts', 'utf8');

describe('P1-D isolated browser UAT safety', () => {
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
  });
});
