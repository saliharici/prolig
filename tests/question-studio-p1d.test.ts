import { describe, expect, it } from 'vitest';
import { compareQuestionRevisions } from '../src/questions/revision-compare';
import type { ApiQuestion } from '../src/questions/types';
import type { QuestionStudioFormValues } from '../src/questions/studio-state';
import fs from 'node:fs';
import path from 'node:path';

const local: QuestionStudioFormValues = {
  content: 'İki oturumlu matematik sorusu - yerel sürüm',
  level: 'Ortaokul', grade: '8. Sınıf', projectId: null,
  options: ['Birim 1', 'Birim 2', 'Birim 3', 'Birim 4'],
  correctAnswer: 'D', explanation: 'Yazarın kendi gerekçesi',
  assets: [], assetPlacement: 'STEM', assetType: 'IMAGE',
  assetUrl: '', assetTitle: '', assetAltText: ''
};
const server: ApiQuestion = {
  id: 12, content: 'İki oturumlu matematik sorusu - güncel sunucu sürümü',
  grade: '8. Sınıf', projectId: null,
  options: ['Birim 1', 'Birim 2', 'Birim 3', 'Birim 4'],
  correctAnswer: 'B', explanation: 'Sunucuda değişen açıklama',
  imageUrl: null, assets: [], objectiveCode: null, difficulty: null,
  status: 'TASLAK', editorNote: null, isArchived: false,
  createdAt: '2026-10-11T12:00:00.000Z',
  updatedAt: '2026-10-11T12:00:01.000Z',
  author: null, project: null
};

describe('P1-D revision protection and comparison', () => {
  it('preserves both versions while highlighting content, correct answer and explanation changes', () => {
    const snapshot = structuredClone(local);
    const rows = compareQuestionRevisions(local, server);
    expect(local).toEqual(snapshot);
    expect(rows.find(x => x.field === 'Soru kökü')).toEqual({
      field: 'Soru kökü', local: local.content, server: server.content, changed: true
    });
    expect(rows.find(x => x.field === 'Doğru cevap')?.changed).toBe(true);
    expect(rows.find(x => x.field === 'Çözüm')?.changed).toBe(true);
    expect(rows.find(x => x.field === 'Seçenek A')?.changed).toBe(false);
  });

  it('detects project and media divergence without modifying the draft', () => {
    const rows = compareQuestionRevisions({
      ...local, projectId: 4,
      assets: [{ placement: 'OPTION_B', assetType: 'IMAGE', url: 'https://example.org/figure.png' }]
    }, server);
    expect(rows.find(x => x.field === 'Proje')?.changed).toBe(true);
    expect(rows.find(x => x.field === 'Medya')?.changed).toBe(true);
    expect(rows.find(x => x.field === 'Medya')?.local).toContain('https://example.org/figure.png');
  });

  it('requires client-opened revision on browser PATCH and freezes a rejected edit', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'src/DemoApp.tsx'), 'utf8');
    const patch = fs.readFileSync(path.join(process.cwd(), 'api/v1/questions/[id].ts'), 'utf8');
    expect(src).toContain('input.expectedUpdatedAt = editingQuestion.updatedAt');
    expect(src).toContain("await fetchQuestions('all')");
    expect(src).toContain('setDurableDraftConflict(true)');
    expect(src).toContain('compareQuestionRevisions(questionFormValues, serverQuestionConflict)');
    expect(src).toContain('Yerel taslağı bırak ve güncel soruyu aç');
    // The conditional fallback alert must be closed before rendering the P1-C panel.
    // A missing closing brace breaks the entire JSX parse, not just the conflict UI.
    expect(src.replace(/\r\n/g, '\n')).toContain('</p>}\n          {durableFeatureOn && <section');

    expect(patch).toContain('res.status(428)');
    expect(patch).toContain('question.updatedAt.getTime() !== Date.parse(expectedUpdatedAt)');
    expect(patch).toContain('authorUserId: user.id,');
    expect(patch).toContain('updatedAt: new Date(expectedUpdatedAt)');
  });

  it('prohibits blind DB integration by requiring explicit pilot identity before running', () => {
    const script = fs.readFileSync(path.join(process.cwd(), 'scripts/p1d-pilot-check.mjs'), 'utf8');
    const test = fs.readFileSync(path.join(process.cwd(), 'tests/integration/question-db.test.ts'), 'utf8');
    expect(script).toContain("new URL(DATABASE_URL)");
    expect(script).toContain("current_database()");
    expect(script).toContain("PROLIG_P1D_DB_NAME");
    expect(script).toContain("PROLIG_P1D_DB_HOST");
    expect(script).toContain("PROLIG_P1D_DB_VERIFIED: 'true'");
    expect(script).toContain("args[0] === '--run-integration'");
    expect(script).toContain("runIntegration && PROLIG_P1D_ALLOW_WRITES !== 'true'");
    expect(script).toContain("if (!runIntegration) {");
    expect(script).toContain('P1-D READ-ONLY PREFLIGHT: PASS');
    expect(test).toContain("process.env.PROLIG_P1D_DB_VERIFIED !== 'true'");
  });
});
