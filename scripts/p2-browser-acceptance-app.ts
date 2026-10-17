/**
 * Dedicated local browser preview of the actual PRO-LIG P2 React UI and API GET
 * handlers. Only isolated Neon P2 branch; all persistent mutations denied.
 * A disposable local test-only session can select YAZAR or EDITOR pilot roles.
 * This is not an acceptance test of production password-based login.
 */
import express from 'express';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer as createViteServer } from 'vite';
import react from '@vitejs/plugin-react';
import authMe from '../api/v1/auth/me.js';
import authLogout from '../api/v1/auth/logout.js';
import questions from '../api/v1/questions/index.js';
import projects from '../api/v1/projects/index.js';
import { setSessionCookie } from '../api/v1/_lib/auth.js';
import { prisma } from '../api/v1/_lib/prisma.js';

const PORT = 3138;
const ORIGIN = 'http://127.0.0.1:' + PORT;
const EXPECTED_HOST = 'ep-wild-sea-b2wlp46v.c-6.eu-central-1.aws.neon.tech';
const PILOTS = {
  author: { email: 'pilot.yazar@prolig.local', role: 'YAZAR' },
  editor: { email: 'pilot.editor@prolig.local', role: 'EDITOR' }
} as const;

function verifyRuntime() {
  if (process.env.PROLIG_P2_BROWSER_READONLY !== 'P2_ACCEPTANCE_READONLY_ONLY' ||
      process.env.PROLIG_QUESTION_TYPES_P2 !== 'true' ||
      !process.env.AUTH_SECRET || !process.env.DATABASE_URL) {
    throw new Error('P2 read-only browser isolation not enabled.');
  }
  const parsed = new URL(process.env.DATABASE_URL);
  const host = parsed.hostname.toLowerCase().replace(/-pooler(?=\.)/, '');
  if (host !== EXPECTED_HOST || parsed.pathname !== '/neondb' ||
      !['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('Browser tried to use a database other than isolated P2 acceptance.');
  }
}
if (!process.env.VITEST) verifyRuntime();

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  if (req.headers.host !== '127.0.0.1:' + PORT ||
      (req.headers.origin && req.headers.origin !== ORIGIN)) {
    return res.status(403).json({ error: 'Only same-origin loopback browser is allowed.' });
  }
  if (/\.env|\.git|\/\.local\/|\/@fs\/|\/\.vercel\//i.test(decodeURI(req.path))) {
    return res.status(403).end();
  }
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use(express.urlencoded({ extended: false, limit: '2kb' }));
app.use('/api/', express.json({ limit: '1mb' }));

// Role picker is local to this acceptance app, never added to production APIs.
app.get('/__p2-uat', (_req, res) => res.type('html').send(`<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>PRO-LIG P2 — izole tarayıcı kabulü</title></head>
<body style="font:16px system-ui;max-width:700px;padding:30px;margin:auto;line-height:1.6">
<h1>PRO-LIG P2 — Güvenli tarayıcı önizlemesi</h1>
<p><strong>Yalnızca test dalı. SALT OKUNUR.</strong> Bu oturum, gerçek parola girişi değil;
yerel test JWT'si ile pilot rol seçimini sağlar. Kaydetme, silme, gönderme,
onaylama ve profil değişiklikleri engellenir.</p>
<form action="/__p2-uat/activate" method="post">
<button name="role" value="author" style="padding:14px;margin-right:12px">Pilot YAZAR olarak aç</button>
<button name="role" value="editor" style="padding:14px">Pilot EDITÖR olarak aç</button>
</form>
<p><small>Yerel adres: ${ORIGIN} · P2 Neon branch p2-acceptance-20261017. İşiniz
bittiğinde PowerShell'de Ctrl+C ile kapatın.</small></p>
</body></html>`));

app.post('/__p2-uat/activate', async (req, res) => {
  // A locally served HTML form always sends a matching Origin in modern browsers.
  if (req.headers.origin !== ORIGIN) return res.status(403).send('Origin rejected');
  const role = req.body?.role;
  if (role !== 'author' && role !== 'editor') return res.status(400).send('Invalid pilot role');
  const expected = PILOTS[role];
  const user = await prisma.user.findUnique({ where: { email: expected.email }, include: { role: true } });
  if (!user || user.role.code !== expected.role || user.status !== 'Aktif') {
    return res.status(503).send('Verified P2 pilot fixture is missing');
  }
  setSessionCookie(res as any, user.id);
  res.redirect(303, '/');
});

type Handler = (req: any, res: any) => unknown;
const adapt = (handler: Handler) => (req: any, res: any, next: any) =>
  Promise.resolve(handler(req, res)).catch(next);

app.get('/api/v1/auth/me', adapt(authMe));
app.post('/api/v1/auth/logout', adapt(authLogout));
app.get('/api/v1/questions', adapt(questions));
app.get('/api/v1/projects', adapt(projects));

// No handler capable of DB writes is mounted in this isolated browser service.
app.use('/api/', (_req, res) => res.status(403).json({
  error: 'P2 browser acceptance is READ ONLY; database mutation is blocked.'
}));

if (!process.env.VITEST) {
  const root = process.cwd();
  const vite = await createViteServer({
    root, configFile: false, envDir: false,
    define: {
      'import.meta.env.VITE_QUESTION_STUDIO_P1': JSON.stringify('true'),
      'import.meta.env.VITE_QUESTION_STUDIO_P1C': JSON.stringify('true'),
      'import.meta.env.VITE_QUESTION_STUDIO_P2_EDITOR': JSON.stringify('true'),
      'import.meta.env.VITE_QUESTION_STUDIO_P2_TYPES': JSON.stringify('true'),
      'import.meta.env.PROLIG_P2_LOCAL_GUARDED_WRITES': JSON.stringify('false')
    },
    plugins: [react()],
    resolve: { alias: { '@': root } },
    server: {
      middlewareMode: true, hmr: false,
      fs: {
        strict: true,
        allow: [resolve('src'), resolve('public'), resolve('shared'),
          resolve('node_modules'), resolve('index.html')],
        deny: ['**/.env*', '**/*.env', '**/.local/**','**/.vercel/**',
          '**/.git/**','**/scripts/**']
      }
    },
    appType: 'custom', clearScreen: false, logLevel: 'warn'
  });
  app.use(vite.middlewares);
  app.use(async (req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    try {
      let html = await readFile(resolve('index.html'), 'utf8');
      html = await vite.transformIndexHtml(req.originalUrl, html);
      res.type('html').send(html);
    } catch (err) { next(err); }
  });
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error('P2 browser preview request failed:', err?.code ?? 'SERVER_ERROR');
    if (!res.headersSent) res.status(500).json({ error: 'Read-only preview request failed.' });
  });

  const server = createServer(app);
  server.listen(PORT, '127.0.0.1', () => {
    console.log('P2 isolated browser preview: ' + ORIGIN + '/__p2-uat');
    console.log('Pilot roles: YAZAR / EDITOR; session uses ephemeral local JWT.');
    console.log('READ ONLY: CREATE/PATCH/DELETE/WORKFLOW/PROFILE operations disabled.');
    console.log('Ctrl+C to stop. No Vercel or production service is used.');
  });
  const stop = () => { server.close(); void vite.close(); void prisma.$disconnect(); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

export { app, verifyRuntime, PILOTS, EXPECTED_HOST };
