import { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../_lib/prisma.js';
import { getCurrentUser } from '../_lib/current-user.js';
import { buildQuestionReadScope } from '../_lib/question-access.js';
import { formatQuestionDto } from '../_lib/question-dto.js';
import { parseQuestionAssets } from '../_lib/question-assets.js';
import { parseTypedQuestion, usesTypedQuestion } from '../_lib/question-type-validation.js';
import { getQuestionArchiveStateMap } from '../_lib/question-archive.js';
import { Client } from 'pg';
import { isP1DPreviewSandboxTarget, p1dPreviewRefusalCode, P1D_SANDBOX_DATABASE } from '../_lib/p1d-preview-identity.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      // Preview-only read-only identity check, guarded before authentication.
      if (req.query.__p1d_sandbox_probe === '1') {
        return await handleSandboxProbe(res);
      }
      return await handleGet(req, res);
    } else if (req.method === 'POST') {
      return await handlePost(req, res);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


/**
 * P1-D Preview-only sandbox check. Reuses the existing Question API function
 * so Hobby's 12-serverless-function cap is not exceeded.
 * Fails closed before opening a connection for any other branch or database.
 */
async function handleSandboxProbe(res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const connectionString = process.env.DATABASE_URL;
  if (!isP1DPreviewSandboxTarget({
    vercelEnv: process.env.VERCEL_ENV,
    gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF,
    databaseUrl: connectionString
  })) {
    const reason = p1dPreviewRefusalCode({
      vercelEnv: process.env.VERCEL_ENV,
      gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF,
      databaseUrl: connectionString
    });
    // Production and other environments remain indistinguishable to callers.
    return res.status(404).json({
      sandboxVerified: false,
      ...(process.env.VERCEL_ENV === 'preview' ? { reason } : {})
    });
  }

  const client = new Client({ connectionString, connectionTimeoutMillis: 6000 });
  let connected = false;
  try {
    await client.connect();
    connected = true;
    await client.query('BEGIN READ ONLY');
    const result = await client.query<{
      database_name: string;
      migration_applied: boolean;
      sandbox_project_found: boolean;
    }>(`
      SELECT
        current_database() AS database_name,
        EXISTS (
          SELECT 1 FROM public."_prisma_migrations"
          WHERE migration_name = '20261011115000_question_media_assets'
            AND finished_at IS NOT NULL AND rolled_back_at IS NULL
        ) AS migration_applied,
        EXISTS (
          SELECT 1 FROM public."Project"
          WHERE code = 'PILOT-MAT-8-001'
        ) AS sandbox_project_found
    `);
    const first = result.rows[0];
    const sandboxVerified = (
      first?.database_name === P1D_SANDBOX_DATABASE &&
      first.migration_applied === true &&
      first.sandbox_project_found === true
    );
    return res.status(sandboxVerified ? 200 : 503).json({ sandboxVerified, readOnly: true });
  } catch {
    return res.status(503).json({ sandboxVerified: false });
  } finally {
    if (connected) {
      await client.query('ROLLBACK').catch(() => undefined);
    }
    await client.end().catch(() => undefined);
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (user.role.code === 'MUHASEBE') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Legacy publisher pool access is unchanged; projectId=NULL never implies private.
  if (req.query.library !== undefined && !['personal'].includes(String(req.query.library))) {
    return res.status(400).json({ error: 'Unknown library scope' });
  }
  const personal = req.query.library === 'personal';
  if (personal && user.role.code !== 'YAZAR') return res.status(403).json({ error: 'Only the owning author may access private questions' });
  const where = personal
    ? { authorUserId: user.id, isPersonal: true }
    : { AND: [buildQuestionReadScope(user), { isPersonal: false }] };

  const questions = await prisma.question.findMany({
    where,
    include: {
      authorUser: {
        include: {
          AuthorProfile: {
            include: {
              branch: true
            }
          }
        }
      },
      project: true,
      assets: { orderBy: { sortOrder: 'asc' } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const archiveMode = req.query.archive === 'archived'
    ? 'archived'
    : req.query.archive === 'all'
      ? 'all'
      : 'active';
  const archiveState = await getQuestionArchiveStateMap(questions.map((question) => question.id));
  const visible = questions.filter((question) => {
    const archived = archiveState.get(question.id) === true;
    if (archiveMode === 'all') return true;
    return archiveMode === 'archived' ? archived : !archived;
  });

  return res.status(200).json(
    visible.map((question) => formatQuestionDto(question, archiveState.get(question.id) === true))
  );
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (user.role.code !== 'YAZAR') {
    return res.status(403).json({ error: 'Only YAZAR can create questions' });
  }

  if (!user.AuthorProfile) {
    return res.status(403).json({ error: 'AuthorProfile required' });
  }

  const { content, grade, objectiveCode, difficulty, options, correctAnswer, explanation, projectId, taskId, assets } = req.body || {};
  const isPersonal = req.body?.isPersonal === true;
  if (req.body?.isPersonal !== undefined && typeof req.body.isPersonal !== 'boolean')
    return res.status(400).json({ error: 'Invalid personal scope' });
  if (isPersonal && (projectId != null || taskId != null))
    return res.status(400).json({ error: 'Private questions cannot be assigned to publishing projects or tasks' });
  const personalSubject = isPersonal ? req.body?.personalSubject : null;
  const personalTopic = isPersonal ? req.body?.personalTopic : null;
  for (const field of [personalSubject, personalTopic]) {
    if (field != null && (typeof field !== 'string' || !field.trim() || field.length > 100))
      return res.status(400).json({ error: 'Invalid subject or topic' });
  }
  if (taskId !== undefined && taskId !== null) {
    if (!Number.isSafeInteger(taskId) || taskId <= 0 || projectId == null)
      return res.status(400).json({ error: 'Valid taskId and projectId required together' });
    const task = await prisma.task.findUnique({ where: { id: taskId },
      select: { projectId: true, assignedAuthorProfileId: true, targetQuestionCount: true } });
    if (!task || task.projectId !== projectId || task.assignedAuthorProfileId !== user.AuthorProfile.id)
      return res.status(403).json({ error: 'Task not assigned to this author and project' });
    if (task.targetQuestionCount <= 0)
      return res.status(409).json({ error: 'Task has no question production target' });
  }
  const typed = usesTypedQuestion(req.body);
  const typedResult = typed ? parseTypedQuestion(req.body) : null;
  if (typedResult?.error) return res.status(typedResult.status!).json({ error: typedResult.error });

  if (!content || typeof content !== 'string' || content.trim().length < 10 || content.trim().length > 1200) {
    return res.status(400).json({ error: 'Invalid content' });
  }

  if (!grade || typeof grade !== 'string' || grade.trim().length === 0 || grade.length > 50) {
    return res.status(400).json({ error: 'Invalid grade' });
  }

  if (!typed && (!options || !Array.isArray(options) || options.length !== 4)) {
    return res.status(400).json({ error: 'Options must be exactly 4 strings' });
  }
  const cleanOptions = (options || []).map((o: any) => typeof o === 'string' ? o.trim() : '');
  if (!typed && cleanOptions.some((o: string) => o.length === 0 || o.length > 500)) {
    return res.status(400).json({ error: 'Invalid option length' });
  }

  if (!typed && (!correctAnswer || !['A', 'B', 'C', 'D'].includes(correctAnswer))) {
    return res.status(400).json({ error: 'Invalid correctAnswer' });
  }

  if (explanation !== undefined && explanation !== null) {
    if (typeof explanation !== 'string' || explanation.trim().length > 600) {
      return res.status(400).json({ error: 'Invalid explanation' });
    }
  }

  if (objectiveCode !== undefined && objectiveCode !== null) {
    if (typeof objectiveCode !== 'string' || objectiveCode.trim().length > 100) {
      return res.status(400).json({ error: 'Invalid objectiveCode' });
    }
  }

  if (difficulty !== undefined && difficulty !== null) {
    if (typeof difficulty !== 'string' || difficulty.trim().length > 100) {
      return res.status(400).json({ error: 'Invalid difficulty' });
    }
  }

  const parsedAssets = parseQuestionAssets(assets);
  if (!parsedAssets.ok) {
    return res.status(400).json({ error: parsedAssets.error });
  }

  if (projectId !== undefined && projectId !== null) {
    if (typeof projectId !== 'number' || !Number.isSafeInteger(projectId) || projectId <= 0) {
      return res.status(400).json({ error: 'Invalid projectId' });
    }

    const pa = await prisma.projectAuthor.findUnique({
      where: {
        projectId_authorProfileId: {
          projectId,
          authorProfileId: user.AuthorProfile.id
        }
      },
      include: { project: { select: { branchId: true, targetGrade: true } } }
    });

    if (!pa) {
      return res.status(403).json({ error: 'Not assigned to this project' });
    }
    if (pa.project.branchId !== user.AuthorProfile.branchId) {
      return res.status(403).json({ error: 'Project branch is outside author branch' });
    }
    if (grade.trim() !== pa.project.targetGrade) {
      return res.status(409).json({
        error: 'Question grade must match project target grade',
        expectedGrade: pa.project.targetGrade
      });
    }
  }

  const question = await prisma.$transaction(async (tx: any) => {
    const q = await tx.question.create({
      data: {
        content: content.trim(),
        grade: grade.trim(),
        objectiveCode: objectiveCode ? objectiveCode.trim() : null,
        difficulty: difficulty ? difficulty.trim() : null,
        options: cleanOptions,
        correctAnswer: correctAnswer,
        ...typedResult?.data,
        explanation: explanation ? explanation.trim() : null,
        projectId: projectId || null,
        taskId: taskId ?? null,
        isPersonal,
        personalSubject: isPersonal ? (personalSubject?.trim() ?? null) : null,
        personalTopic: isPersonal ? (personalTopic?.trim() ?? null) : null,
        authorUserId: user.id,
        status: 'TASLAK',
        assets: parsedAssets.assets.length > 0 ? {
          create: parsedAssets.assets
        } : undefined
      },
      include: {
        authorUser: { include: { AuthorProfile: { include: { branch: true } } } },
        project: true,
        assets: { orderBy: { sortOrder: 'asc' } }
      }
    });

    await tx.activityLog.create({
      data: {
        userName: user.fullName,
        action: 'QUESTION_CREATED',
        entityType: 'Question',
        entityId: q.id,
        details: JSON.stringify({ status: 'TASLAK' })
      }
    });

    return q;
  });

  return res.status(201).json(formatQuestionDto(question));
}
