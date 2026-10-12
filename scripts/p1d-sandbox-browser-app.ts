/**
 * Local-only PRO-LIG P1-D browser acceptance service.
 * Launched exclusively by p1d-sandbox-browser.mjs with sanitized sandbox credentials.
 * No Vercel CLI or linked Vercel environments.
 * Whitelist routes: auth + question CRUD/workflow + project reads. All other APIs disabled.
 */
import express from 'express';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer as createViteServer } from 'vite';
import react from '@vitejs/plugin-react';
import authLogin from '../api/v1/auth/login.ts';
import authMe from '../api/v1/auth/me.ts';
import authLogout from '../api/v1/auth/logout.ts';
import questions from '../api/v1/questions/index.ts';
import questionId from '../api/v1/questions/[id].ts';
import workflow from '../api/v1/questions/[id]/workflow.ts';
import projects from '../api/v1/projects/index.ts';

const PORT = 3137;
const ORIGIN = 'http://127.0.0.1:' + PORT;
const WRITES = process.env.PROLIG_P1D_BROWSER_WRITES === 'true';

if (process.env.PROLIG_P1D_DB_NAME !== 'prolig_p1d_sandbox' ||
    !process.env.AUTH_SECRET ||
    !process.env.DATABASE_URL ||
    new URL(process.env.DATABASE_URL).pathname !== '/prolig_p1d_sandbox' ||
    process.env.DATABASE_URL.includes('BURAYA_')) {
  throw new Error('Isolated P1-D browser runtime environment was not verified.');
}

const app = express();
app.disable('x-powered-by');

app.use((req, res, next) => {
  const host = req.headers.host;
  if (host !== '127.0.0.1:' + PORT) {
    return res.status(403).json({ error: 'Only sandbox loopback host is allowed.' });
  }
  const origin = req.headers.origin;
  if (origin && origin !== ORIGIN) {
    return res.status(403).json({ error: 'Cross-origin requests are not allowed.' });
  }
  next();
});
app.use('/api/', express.json({ limit: '1mb' }));
app.use('/api/', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

type Handler = (req: any, res: any) => unknown;
const adapt = (handler: Handler) => (req: any, res: any, next: any) =>
  Promise.resolve(handler(req, res)).catch(next);

function withId(req: any, _res: any, next: any) {
  // Vercel dynamic routes receive the ID as req.query.id.
  // Convert Express route params to the shape expected by those handlers.
  Object.defineProperty(req, 'query', {
    value: { ...req.query, id: req.params.id },
    configurable: true
  });
  next();
}

function mutationOnly(req: any, res: any, next: any) {
  if (!WRITES) return res.status(403).json({
    error: 'P1-D sandbox is read-only. Browser question write UAT is disabled.'
  });
  next();
}

app.post('/api/v1/auth/login', adapt(authLogin));
app.get('/api/v1/auth/me', adapt(authMe));
app.post('/api/v1/auth/logout', adapt(authLogout));

app.get('/api/v1/questions', adapt(questions));
app.post('/api/v1/questions', mutationOnly, adapt(questions));
app.get('/api/v1/projects', adapt(projects));
app.get('/api/v1/questions/:id', withId, adapt(questionId));
app.patch('/api/v1/questions/:id', withId, mutationOnly, adapt(questionId));
app.post('/api/v1/questions/:id/workflow', withId, mutationOnly, adapt(workflow));
app.post('/api/v1/questions/:id', withId, mutationOnly, adapt(questionId));
app.delete('/api/v1/questions/:id', withId, mutationOnly, adapt(questionId));

// Other PRO-LIG modules intentionally not enabled for this P1-D browser UAT.
app.use('/api/', (_req, res) => res.status(404).json({
  error: 'API not available in isolated P1-D browser preview.'
}));

const root = process.cwd();
const vite = await createViteServer({
  root,
  configFile: false,
  envDir: false,
  // Enable P1-D Studio and P1-C encrypted draft recovery ONLY in this isolated
  // browser preview; this does not modify ordinary Vercel/Vite environments.
  define: {
    'import.meta.env.VITE_QUESTION_STUDIO_P1': JSON.stringify('true'),
    'import.meta.env.VITE_QUESTION_STUDIO_P1C': JSON.stringify('true')
  },
  plugins: [react()],
  resolve: { alias: { '@': root } },
  server: {
    middlewareMode: true,
    hmr: false,
    fs: {
      strict: true,
      allow: [
        resolve('src'), resolve('public'), resolve('shared'),
        resolve('node_modules'), resolve('index.html')
      ],
      deny: [
        '**/.env*', '**/*.env', '**/.local/**',
        '**/.vercel/**', '**/.git/**', '**/scripts/**'
      ]
    }
  },
  appType: 'custom',
  clearScreen: false,
  logLevel: 'warn'
});
app.use(vite.middlewares);
app.use(async (req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
  try {
    let html = await readFile(resolve('index.html'), 'utf8');
    html = await vite.transformIndexHtml(req.originalUrl, html);
    res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
  } catch (err) {
    next(err);
  }
});
app.use((error: any, _req: any, res: any, _next: any) => {
  // The browser only needs a generic error; never return driver connection strings.
  console.error('P1-D browser handler error:', error?.code || 'HANDLER_ERROR');
  if (!res.headersSent) res.status(500).json({ error: 'Sandbox request failed.' });
});

const httpServer = createServer(app);
httpServer.listen(PORT, '127.0.0.1', () => {
  console.log('P1-D sandbox browser running: ' + ORIGIN);
  console.log(WRITES ? 'Browser question writes: APPROVED SANDBOX ONLY' :
    'Browser question writes: BLOCKED (read-only preview)');
  console.log('Stop with Ctrl+C. Existing Vercel/Production not connected.');
});

function stop() {
  httpServer.close();
  void vite.close();
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
