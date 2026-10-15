import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { buildQuestionCreateInput, QuestionFormValidationError, toP2SandboxLegacyDraft } from '../src/questions/edit';
import { questionTypeDraft } from '../src/questions/question-type-state';

const fixture = () => ({
  ...questionTypeDraft(),
  content: 'Kenarları 4 cm ve 7 cm olan dikdörtgenin çevresi kaç cm?',
  grade: '8. Sınıf', projectId: 1,
  options: ['11', '18', '22', '28'], correctAnswer: 'C',
  explanation: '2 x (4 + 7) = 22 cm', assets: [],
  objectiveCode: 'MAT.8.1', difficulty: 'Orta'
});

describe('P2 guarded five-stage legacy persistence', () => {
  it('allows a guided four-option question through the legacy API without typed fields', () => {
    const legacy = toP2SandboxLegacyDraft(fixture());
    const payload = buildQuestionCreateInput(legacy, true);
    expect(payload).not.toHaveProperty('questionType');
    expect(payload).not.toHaveProperty('optionCount');
    expect(payload.options).toHaveLength(4);
    expect(payload.correctAnswer).toBe('C');
    expect(payload.objectiveCode).toBe('P2-UAT MAT.8.1');
    expect(payload.difficulty).toBe('Orta');
  });

  it('refuses typed questions and five-option payloads in guarded mode', () => {
    expect(() => toP2SandboxLegacyDraft({ ...fixture(), questionType: 'TRUE_FALSE' }))
      .toThrow(QuestionFormValidationError);
    expect(() => toP2SandboxLegacyDraft({ ...fixture(), optionCount: 5, options: [...fixture().options, '32'] }))
      .toThrow(QuestionFormValidationError);
    expect(() => toP2SandboxLegacyDraft({ ...fixture(), questionType: 'OPEN_ENDED' }))
      .toThrow(QuestionFormValidationError);
  });

  it('keeps typed backend disabled and sandbox-only P2 write approval', () => {
    const launcher = fs.readFileSync('scripts/p1d-sandbox-browser.mjs', 'utf8');
    const server = fs.readFileSync('scripts/p1d-sandbox-browser-app.ts', 'utf8');
    const demoApp = fs.readFileSync('src/DemoApp.tsx', 'utf8');
    expect(launcher).toContain("PROLIG_QUESTION_TYPES_P2: 'false'");
    expect(launcher).toContain('PROLIG_P2_BROWSER_UAT_APPROVAL');
    expect(server).toContain('Typed question fields are disabled in guarded sandbox persistence.');
    expect(server).toContain("PILOT_PROJECT_CODE = 'PILOT-MAT-8-001'");
    expect(demoApp).toContain('toP2SandboxLegacyDraft(draft)');
    expect(demoApp).toContain('<GuidedQuestionStudio');
  });
});
