import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../api/v1/_lib/prisma.js';
import * as questionIndex from '../../api/v1/questions/index.js';
import * as questionId from '../../api/v1/questions/[id].js';
import * as questionWorkflow from '../../api/v1/questions/[id]/workflow.js';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

describe('Question DB Integration', () => {
  let yazar: any;
  let editor: any;
  let muhasebe: any;
  let genel: any;
  let bolge: any;
  let il: any;
  
  let tempQuestionId: number;
  let initialRevision: string;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL || !process.env.AUTH_SECRET ||
        process.env.PROLIG_PILOT_DB_CONFIRMED !== 'true' ||
        process.env.PROLIG_P1D_DB_VERIFIED !== 'true') {
      throw new Error('P1-D safety gate failed: run node scripts/p1d-pilot-check.mjs after verifying isolated pilot identity.');
    }
    yazar = await prisma.user.findUnique({ where: { email: 'pilot.yazar@prolig.local' }, include: { role: true, AuthorProfile: true } });
    editor = await prisma.user.findUnique({ where: { email: 'pilot.editor@prolig.local' }, include: { role: true } });
    muhasebe = await prisma.user.findUnique({ where: { email: 'pilot.muhasebe@prolig.local' }, include: { role: true } });
    genel = await prisma.user.findUnique({ where: { email: 'pilot.genel@prolig.local' }, include: { role: true } });
    bolge = await prisma.user.findUnique({ where: { email: 'pilot.bolge@prolig.local' }, include: { role: true } });
    il = await prisma.user.findUnique({ where: { email: 'pilot.il@prolig.local' }, include: { role: true } });
    // This suite exercises a successful EDITOR approval cycle. The pilot fixture must
    // explicitly fall within the editor's assigned branch, geography and grade.
    if (!yazar?.AuthorProfile || !editor?.editorBranchId) {
      throw new Error('Pilot setup missing YAZAR profile or EDITOR branch assignment');
    }
    if (yazar.AuthorProfile.branchId !== editor.editorBranchId) {
      throw new Error('Pilot EDITOR branch does not match pilot YAZAR branch');
    }
    if (editor.provinceId && editor.provinceId !== yazar.AuthorProfile.provinceId) {
      throw new Error('Pilot EDITOR province does not match pilot YAZAR province');
    }
    if (!editor.provinceId && !editor.assignedRegion) {
      throw new Error('Pilot EDITOR has no configured geography');
    }
  });

  afterAll(async () => {
    if (tempQuestionId) {
      await prisma.activityLog.deleteMany({ where: { entityId: tempQuestionId, entityType: 'Question' } });
      await prisma.question.delete({ where: { id: tempQuestionId } });
    }
    const qCount = await prisma.question.count({ where: { id: tempQuestionId } });
    const aCount = await prisma.activityLog.count({ where: { entityId: tempQuestionId, entityType: 'Question' } });
    expect(qCount).toBe(0);
    expect(aCount).toBe(0);
    await prisma.$disconnect();
  });

  const mockReq = (user: any, body?: any, method?: string): any => {
    let token = '';
    if (user && process.env.AUTH_SECRET) {
      token = jwt.sign({ sub: String(user.id) }, process.env.AUTH_SECRET, { expiresIn: '7d', algorithm: 'HS256' });
    }
    const cookieHeader = token ? serialize('prolig_session', token) : '';
    return {
      user, // still keeping it just in case
      headers: { cookie: cookieHeader },
      body,
      method: method || (body ? 'POST' : 'GET'),
      query: { id: typeof tempQuestionId !== "undefined" ? tempQuestionId.toString() : undefined }
    };
  };
  
  const mockRes = (): any => {
    const res: any = { statusCode: 200, data: null };
    res.status = (code: number) => { res.statusCode = code; return res; };
    res.json = (data: any) => { res.data = data; return res; };
    return res;
  };

  it('YAZAR login -> PASS (yazar loaded)', () => {
    expect(yazar).toBeTruthy();
    expect(yazar.role.code).toBe('YAZAR');
  });

  it('YAZAR create', async () => {
    const req = mockReq(yazar, {
      content: 'This is a test question for DB integration with enough length',
      projectId: null,
      grade: editor.editorGrade || '9',
      objectiveCode: 'M.9.1',
      difficulty: 'ORTA',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
      explanation: 'Because it is A'
    });
    const res = mockRes();
    await questionIndex.default(req, res);
    
    if (res.statusCode !== 201) console.error('YAZAR CREATE ERROR:', res.data);
      expect(res.statusCode).toBe(201);
    expect(res.data.status).toBe('TASLAK');
    expect(res.data.author.id).toBe(yazar.id);
    tempQuestionId = res.data.id;
  });

  it('YAZAR GET temporary question visible', async () => {
    const req = mockReq(yazar);
    const res = mockRes();
    await questionIndex.default(req, res);
    expect(res.statusCode).toBe(200);
    const found = res.data.find((q: any) => q.id === tempQuestionId);
    expect(found).toBeTruthy();
    initialRevision = new Date(found.updatedAt).toISOString();
  });

  it('YAZAR PATCH TASLAK', async () => {
    const q = await prisma.question.findUnique({ where: { id: tempQuestionId } });
    expect(q).toBeTruthy();
    const req = mockReq(yazar, {
      content: 'Updated Temp Question content length',
      options: ['Alpha', 'Beta', 'Gamma', 'Delta'],
      correctAnswer: 'D',
      explanation: 'Four choices, the fourth is correct',
      expectedUpdatedAt: q!.updatedAt.toISOString()
    });
    const res = mockRes();
    req.method = 'PATCH'; await questionId.default(req, res);
    
    expect(res.statusCode).toBe(200);
    expect(res.data.content).toBe('Updated Temp Question content length');
    expect(res.data.options).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta']);
    expect(res.data.correctAnswer).toBe('D');
    expect(res.data.explanation).toBe('Four choices, the fourth is correct');

    const audit = await prisma.activityLog.findFirst({ where: { entityId: tempQuestionId, entityType: 'Question', action: 'QUESTION_UPDATED' } });
    expect(audit).toBeTruthy();
  });

  it('P1-D GET after PATCH returns persistent question fields and advanced revision', async () => {
    const req = mockReq(yazar);
    const res = mockRes();
    await questionIndex.default(req, res);
    expect(res.statusCode).toBe(200);
    const actual = res.data.find((q: any) => q.id === tempQuestionId);
    expect(actual).toBeTruthy();
    expect(actual.content).toBe('Updated Temp Question content length');
    expect(actual.options).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta']);
    expect(actual.correctAnswer).toBe('D');
    expect(actual.explanation).toBe('Four choices, the fourth is correct');
    expect(Date.parse(actual.updatedAt)).toBeGreaterThan(Date.parse(initialRevision));
  });

  it('P1-D two-session stale PATCH returns 409 without overwriting the first edit', async () => {
    const req = mockReq(yazar, {
      content: 'Second browser session must not overwrite newer content',
      expectedUpdatedAt: initialRevision
    });
    req.method = 'PATCH';
    const res = mockRes();
    await questionId.default(req, res);
    expect(res.statusCode).toBe(409);
    const current = await prisma.question.findUnique({ where: { id: tempQuestionId } });
    expect(current?.content).toBe('Updated Temp Question content length');
    expect(current?.options).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta']);
    const audit = await prisma.activityLog.count({
      where: { entityType: 'Question', entityId: tempQuestionId, action: 'QUESTION_UPDATED' }
    });
    expect(audit).toBe(1);
  });

  it('SUBMIT TASLAK -> INCELEMEDE', async () => {
    const q = await prisma.question.findUnique({ where: { id: tempQuestionId } });
    const req = mockReq(yazar, { action: 'submit' });
    const res = mockRes();
    req.method = 'POST'; await questionWorkflow.default(req, res);
    
    expect(res.statusCode).toBe(200);
    expect(res.data.status).toBe('INCELEMEDE');
    
    const audit = await prisma.activityLog.findFirst({ where: { entityId: tempQuestionId, entityType: 'Question', action: 'QUESTION_SUBMITTED' } });
    expect(audit).toBeTruthy();
  });

  it('YAZAR PATCH while INCELEMEDE -> 409', async () => {
    const q = await prisma.question.findUnique({ where: { id: tempQuestionId } });
    const req = mockReq(yazar, { content: 'Should fail content length' });
    const res = mockRes();
    req.method = 'PATCH'; await questionId.default(req, res);
    expect(res.statusCode).toBe(409);
  });

  it('EDITOR login -> PASS', () => {
    expect(editor).toBeTruthy();
    expect(editor.role.code).toBe('EDITOR');
    expect(editor.editorBranchId).toBeTruthy();
  });

  it('EDITOR GET Matematik question visible', async () => {
    const req = mockReq(editor);
    const res = mockRes();
    await questionIndex.default(req, res);
    expect(res.statusCode).toBe(200);
    const found = res.data.find((q: any) => q.id === tempQuestionId);
    expect(found).toBeTruthy();
  });

  it('EDITOR request_revision', async () => {
    const q = await prisma.question.findUnique({ where: { id: tempQuestionId } });
    const req = mockReq(editor, { action: 'request_revision', note: '   Please revise   ' });
    const res = mockRes();
    req.method = 'POST'; await questionWorkflow.default(req, res);
    
    expect(res.statusCode).toBe(200);
    expect(res.data.status).toBe('REVIZYON');
    expect(res.data.editorNote).toBe('Please revise');

    const audit = await prisma.activityLog.findFirst({ where: { entityId: tempQuestionId, entityType: 'Question', action: 'QUESTION_REVISION_REQUESTED' } });
    expect(audit).toBeTruthy();
  });

  it('YAZAR PATCH REVIZYON', async () => {
    const q = await prisma.question.findUnique({ where: { id: tempQuestionId } });
    expect(q).toBeTruthy();
    const req = mockReq(yazar, {
      content: 'Revised Question content length',
      expectedUpdatedAt: q!.updatedAt.toISOString()
    });
    const res = mockRes();
    req.method = 'PATCH'; await questionId.default(req, res);
    expect(res.statusCode).toBe(200);
  });

  it('YAZAR resubmit', async () => {
    const q = await prisma.question.findUnique({ where: { id: tempQuestionId } });
    const req = mockReq(yazar, { action: 'submit' });
    const res = mockRes();
    req.method = 'POST'; await questionWorkflow.default(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.data.status).toBe('INCELEMEDE');
  });

  it('EDITOR approve', async () => {
    const q = await prisma.question.findUnique({ where: { id: tempQuestionId } });
    const req = mockReq(editor, { action: 'approve' });
    const res = mockRes();
    req.method = 'POST'; await questionWorkflow.default(req, res);
    
    expect(res.statusCode).toBe(200);
    expect(res.data.status).toBe('ONAYLANDI');

    const audit = await prisma.activityLog.findFirst({ where: { entityId: tempQuestionId, entityType: 'Question', action: 'QUESTION_APPROVED' } });
    expect(audit).toBeTruthy();
  });

  it('YAZAR PATCH ONAYLANDI -> 409', async () => {
    const q = await prisma.question.findUnique({ where: { id: tempQuestionId } });
    const req = mockReq(yazar, { content: 'Should fail again content' });
    const res = mockRes();
    req.method = 'PATCH'; await questionId.default(req, res);
    expect(res.statusCode).toBe(409);
  });

  it('MUHASEBE GET questions -> 403', async () => {
    const req = mockReq(muhasebe);
    const res = mockRes();
    await questionIndex.default(req, res);
    expect(res.statusCode).toBe(403);
  });

  it('GENEL GET -> 200 and question visible', async () => {
    const req = mockReq(genel);
    const res = mockRes();
    await questionIndex.default(req, res);
    expect(res.statusCode).toBe(200);
    const found = res.data.find((q: any) => q.id === tempQuestionId);
    expect(found).toBeTruthy();
  });

  it('BOLGE GET -> 200 and question visible', async () => {
    const req = mockReq(bolge);
    const res = mockRes();
    await questionIndex.default(req, res);
    expect(res.statusCode).toBe(200);
    const found = res.data.find((q: any) => q.id === tempQuestionId);
    expect(found).toBeTruthy();
  });

  it('IL GET -> 200 and question visible', async () => {
    const req = mockReq(il);
    const res = mockRes();
    await questionIndex.default(req, res);
    expect(res.statusCode).toBe(200);
    const found = res.data.find((q: any) => q.id === tempQuestionId);
    expect(found).toBeTruthy();
  });

  it('QUESTION_CREATED audit exists', async () => {
    const audit = await prisma.activityLog.findFirst({ where: { entityId: tempQuestionId, entityType: 'Question', action: 'QUESTION_CREATED' } });
    expect(audit).toBeTruthy();
  });
});



