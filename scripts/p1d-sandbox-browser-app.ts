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
import authLogin from '../api/v1/auth/login.js';
import authMe from '../api/v1/auth/me.js';
import authLogout from '../api/v1/auth/logout.js';
import questions from '../api/v1/questions/index.js';
import questionId from '../api/v1/questions/[id].js';
import workflow from '../api/v1/questions/[id]/workflow.js';
import projects from '../api/v1/projects/index.js';
import { getCurrentUser } from '../api/v1/_lib/current-user.js';
import { prisma } from '../api/v1/_lib/prisma.js';

const PORT = 3137;
const ORIGIN = 'http://127.0.0.1:' + PORT;
const WRITES = process.env.PROLIG_P1D_BROWSER_WRITES === 'true';
const P2_EDITOR = process.env.VITE_QUESTION_STUDIO_P2_EDITOR === 'true';
const P2_GUARDED_WRITES = process.env.PROLIG_P2_GUARDED_WRITES === 'true';
const PILOT_AUTHOR_EMAIL = 'pilot.yazar@prolig.local';
const PILOT_PROJECT_CODE = 'PILOT-MAT-8-001';
const P2_UAT_MARKER = 'P2-UAT';
const EXPECTED_SANDBOX_HOST_ROOT = 'ep-lingering-leaf-b9q3ohxd';

if (!process.env.VITEST) {
  if (process.env.PROLIG_P1D_DB_NAME !== 'prolig_p1d_sandbox' ||
      !process.env.AUTH_SECRET ||
      !process.env.DATABASE_URL ||
      new URL(process.env.DATABASE_URL).pathname !== '/prolig_p1d_sandbox' ||
      !new URL(process.env.DATABASE_URL).hostname.toLowerCase().includes(EXPECTED_SANDBOX_HOST_ROOT) ||
      process.env.DATABASE_URL.includes('BURAYA_')) {
    throw new Error('Isolated P1-D browser runtime environment was not verified.');
  }
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

async function applyP2Guards(req: any, res: any, next: any) {
  if (req.path && req.path.includes('/workflow')) {
    return res.status(403).json({
      error: 'P2 guarded persistence restricts questions to TASLAK status. Workflow transitions are blocked.'
    });
  }

  if (req.method === 'DELETE') {
    return res.status(403).json({
      error: 'Arbitrary browser DELETE is blocked in P2 guarded mode. Use dedicated exact-ID cleanup procedure.'
    });
  }

  if (req.body?.action === 'archive' || req.body?.action === 'restore' || (req.path && req.path.includes('/archive'))) {
    return res.status(403).json({
      error: 'Archiving and restoring are blocked in P2 guarded persistence mode.'
    });
  }

  const currentUser = await getCurrentUser(req);
  if (!currentUser) {
    return res.status(403).json({
      error: 'P2 guarded persistence requires an active pilot author session.'
    });
  }

  const userRecord = await prisma.user?.findUnique({
    where: { id: currentUser.id },
    select: { email: true }
  });
  const email = userRecord?.email || (currentUser as any).email;
  if (!email || email !== PILOT_AUTHOR_EMAIL) {
    return res.status(403).json({
      error: `P2 guarded persistence permits question operations only by pilot author (${PILOT_AUTHOR_EMAIL}).`
    });
  }

  if (req.method === 'POST') {
    if (req.params?.id || req.query?.id) {
      return res.status(403).json({
        error: 'Question lifecycle actions are blocked in P2 guarded persistence mode.'
      });
    }

    const projectId = req.body?.projectId;
    if (!projectId) {
      return res.status(403).json({
        error: 'P2 guarded persistence requires explicit association with authorized synthetic project.'
      });
    }

    const project = await prisma.project.findUnique({ where: { id: Number(projectId) } });
    if (!project || project.code !== PILOT_PROJECT_CODE) {
      return res.status(403).json({
        error: `P2 guarded persistence permits questions only in synthetic project ${PILOT_PROJECT_CODE}.`
      });
    }

    const objectiveCode = String(req.body?.objectiveCode || '');
    const content = String(req.body?.content || '');
    if (!objectiveCode.includes(P2_UAT_MARKER) && !content.includes(P2_UAT_MARKER)) {
      return res.status(403).json({
        error: 'P2 guarded persistence requires P2-UAT test ownership marker in objectiveCode or content.'
      });
    }

    return next();
  }

  if (req.method === 'PATCH') {
    const questionId = Number(req.params?.id || req.query?.id);
    if (!questionId || !Number.isSafeInteger(questionId)) {
      return res.status(400).json({ error: 'Invalid question ID.' });
    }

    const existing = await prisma.question.findUnique({
      where: { id: questionId },
      include: { authorUser: true, project: true }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Question not found.' });
    }

    if (existing.authorUser?.email !== PILOT_AUTHOR_EMAIL) {
      return res.status(403).json({
        error: 'P2 guarded persistence cannot modify questions belonging to other authors.'
      });
    }

    if (existing.project?.code !== PILOT_PROJECT_CODE) {
      return res.status(403).json({
        error: `P2 guarded persistence cannot modify questions outside synthetic project ${PILOT_PROJECT_CODE}.`
      });
    }

    const isMarked = (existing.objectiveCode && existing.objectiveCode.includes(P2_UAT_MARKER)) ||
                     (existing.content && existing.content.includes(P2_UAT_MARKER));
    if (!isMarked) {
      return res.status(403).json({
        error: 'P2 guarded persistence cannot modify questions without P2-UAT marker.'
      });
    }

    if (existing.status !== 'TASLAK') {
      return res.status(403).json({
        error: 'P2 guarded persistence only permits editing questions in TASLAK status.'
      });
    }

    if (req.body?.projectId !== undefined && Number(req.body.projectId) !== existing.projectId) {
      return res.status(403).json({
        error: 'P2 guarded persistence cannot alter project association during PATCH.'
      });
    }

    if (req.body?.authorUserId !== undefined && Number(req.body.authorUserId) !== existing.authorUserId) {
      return res.status(403).json({
        error: 'P2 guarded persistence cannot alter author during PATCH.'
      });
    }

    if (req.body?.status !== undefined && req.body.status !== 'TASLAK') {
      return res.status(403).json({
        error: 'P2 guarded persistence cannot alter question status from TASLAK.'
      });
    }

    const effectiveObjective = req.body?.objectiveCode !== undefined ? String(req.body.objectiveCode) : String(existing.objectiveCode || '');
    const effectiveContent = req.body?.content !== undefined ? String(req.body.content) : String(existing.content || '');
    if (!effectiveObjective.includes(P2_UAT_MARKER) && !effectiveContent.includes(P2_UAT_MARKER)) {
      return res.status(403).json({
        error: 'P2 guarded persistence cannot remove P2-UAT ownership marker during PATCH.'
      });
    }

    return next();
  }

  return res.status(403).json({ error: 'Operation not permitted in P2 guarded persistence mode.' });
}

function mutationOnly(req: any, res: any, next: any) {
  if (!WRITES) return res.status(403).json({
    error: 'P1-D sandbox is read-only. Browser question write UAT is disabled.'
  });
  if (P2_GUARDED_WRITES) {
    return applyP2Guards(req, res, next).catch(err => {
      console.error('P2 guard error:', err);
      res.status(500).json({ error: 'Sandbox guard check failed.' });
    });
  }
  next();
}

app.post('/api/v1/auth/login', adapt(authLogin));
app.get('/api/v1/auth/me', adapt(authMe));
app.post('/api/v1/auth/logout', adapt(authLogout));

app.get('/api/v1/questions', adapt(questions));
app.post('/api/v1/questions', mutationOnly, adapt(questions));
app.get('/api/v1/projects', adapt(projects));
app.patch('/api/v1/questions/:id', withId, mutationOnly, adapt(questionId));
app.post('/api/v1/questions/:id/workflow', withId, mutationOnly, adapt(workflow));
app.post('/api/v1/questions/:id', withId, mutationOnly, adapt(questionId));
app.delete('/api/v1/questions/:id', withId, mutationOnly, adapt(questionId));

// Other PRO-LIG modules intentionally not enabled for this P1-D browser UAT.
app.use('/api/', (_req, res) => res.status(404).json({
  error: 'API not available in isolated P1-D browser preview.'
}));

if (!process.env.VITEST) {
  const root = process.cwd();
  const vite = await createViteServer({
    root,
    configFile: false,
    envDir: false,
    // Enable P1-D Studio and P1-C encrypted draft recovery ONLY in this isolated
    // browser preview; this does not modify ordinary Vercel/Vite environments.
    define: {
      'import.meta.env.VITE_QUESTION_STUDIO_P1': JSON.stringify('true'),
      'import.meta.env.VITE_QUESTION_STUDIO_P1C': JSON.stringify('true'),
      'import.meta.env.VITE_QUESTION_STUDIO_P2_EDITOR': JSON.stringify(P2_EDITOR ? 'true' : 'false'),
      'import.meta.env.PROLIG_P2_LOCAL_GUARDED_WRITES': JSON.stringify(P2_GUARDED_WRITES ? 'true' : 'false')
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
    if (P2_GUARDED_WRITES) {
      console.log('P2 Guarded Persistence: ACTIVE (pilot.yazar@prolig.local only, PILOT-MAT-8-001 only, P2-UAT marker required, TASLAK only)');
    } else if (P2_EDITOR) {
      console.log('P2 question editor (Tiptap): ENABLED (read-only preview mode)');
    }
    console.log('Stop with Ctrl+C. Existing Vercel/Production not connected.');
  });

  const stop = () => {
    httpServer.close();
    void vite.close();
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

export {
  PILOT_AUTHOR_EMAIL,
  PILOT_PROJECT_CODE,
  P2_UAT_MARKER,
  EXPECTED_SANDBOX_HOST_ROOT,
  applyP2Guards,
  mutationOnly,
  app
};
