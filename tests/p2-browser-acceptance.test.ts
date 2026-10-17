import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const launcher = readFileSync('scripts/p2-browser-acceptance.mjs', 'utf8');
const server = readFileSync('scripts/p2-browser-acceptance-app.ts', 'utf8');

describe('P2 isolated browser acceptance fail-closed contract', () => {
  it('requires exact Neon branch, independent read-only preflight and private file', () => {
    expect(launcher).toContain("const PRIVATE_ENV = '.env.p2-acceptance.local'");
    expect(launcher).toContain("const ACCEPTANCE_HOST = 'ep-wild-sea-b2wlp46v.c-6.eu-central-1.aws.neon.tech'");
    expect(launcher).toContain("const MAIN_HOST = 'ep-aged-rice-b21dkfno.c-6.eu-central-1.aws.neon.tech'");
    expect(launcher).toContain("u.pathname !== '/' + ACCEPTANCE_DB");
    expect(launcher).toContain("['scripts/p2-acceptance-branch-check.mjs']");
    expect(launcher).toContain("if (safety.error || safety.status !== 0)");
  });

  it('defaults to preflight and explicitly declines write/browser mutation modes', () => {
    expect(launcher).toContain("const mode = process.argv.length === 3 ? process.argv[2] : '--preflight'");
    expect(launcher).toContain("['--preflight','--serve'].includes(mode)");
    expect(launcher).not.toContain("'--serve-write'");
    expect(server).toContain("PROLIG_P2_BROWSER_READONLY !== 'P2_ACCEPTANCE_READONLY_ONLY'");
    expect(server).toContain("app.get('/api/v1/questions', adapt(questions))");
    expect(server).toContain("app.get('/api/v1/projects', adapt(projects))");
    expect(server).toContain("app.use('/api/', (_req, res) => res.status(403)");
    expect(server).not.toMatch(/app\.(post|patch|delete)\('\/api\/v1\/questions/);
    expect(server).not.toMatch(/app\.patch\('\/api\/v1\/auth\/me/);
  });

  it('never inherits Vercel or local production credentials into the child', () => {
    expect(launcher).toContain("for (const name of ['PATH','Path','PATHEXT'");
    expect(launcher).toContain("AUTH_SECRET: randomBytes(48).toString('hex')");
    expect(launcher).toContain("NODE_ENV: 'test'");
    expect(launcher).not.toContain("...process.env, DATABASE_URL");
    expect(launcher).not.toContain("vercel dev");
  });

  it('permits only localhost access and local temporary pilot identity', () => {
    expect(server).toContain("const PORT = 3138");
    expect(server).toContain("server.listen(PORT, '127.0.0.1'");
    expect(server).toContain("req.headers.host !== '127.0.0.1:' + PORT");
    expect(server).toContain("req.headers.origin !== ORIGIN");
    expect(server).toContain("const expected = PILOTS[role]");
    expect(server).toContain("setSessionCookie(res as any, user.id)");
    expect(server).toContain("app.post('/__p2-uat/activate'");
    expect(server).toContain("app.get('/api/v1/auth/me', adapt(authMe))");
    expect(server).not.toContain("app.post('/api/v1/auth/login'");
  });

  it('keeps Vite from loading or serving local secrets and enables P2 types only here', () => {
    expect(server).toContain("configFile: false, envDir: false");
    expect(server).toContain("strict: true");
    expect(server).toContain("'**/.env*'");
    expect(server).toContain("'**/.git/**'");
    expect(server).toContain("'import.meta.env.VITE_QUESTION_STUDIO_P2_TYPES': JSON.stringify('true')");
    expect(server).toContain("'import.meta.env.VITE_QUESTION_STUDIO_P2_EDITOR': JSON.stringify('true')");
  });
});
