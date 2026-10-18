import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { toP2SandboxLegacyDraft } from '../src/questions/edit';
import { questionTypeDraft } from '../src/questions/question-type-state';

describe('P2 sandbox question type selection', () => {
  it('shows all defined question types for a new wizard draft, but locks existing questions', () => {
    const wizard = fs.readFileSync('src/questions/GuidedQuestionStudio.tsx', 'utf8');
    expect(wizard).toContain('if (editing || next === type) return;');
    expect(wizard).toContain('disabled={editing} onChange={e => changeType');
    expect(wizard).toContain('Object.entries(questionTypeLabels).map(');
    expect(wizard).not.toContain("filter(([key]) => !sandbox || key === 'MULTIPLE_CHOICE')");
  });

  it('keeps saving disabled for preview-only types in guarded sandbox', () => {
    const demo = fs.readFileSync('src/DemoApp.tsx', 'utf8');
    expect(demo).toContain("(guardedLegacyQuestionWrite && questionTypeExtras.questionType !== 'MULTIPLE_CHOICE')");
    const wizard = fs.readFileSync('src/questions/GuidedQuestionStudio.tsx', 'utf8');
    expect(wizard).toContain('Bu soru türünü beş aşamada önizleyebilirsiniz.');
    const draft = {
      ...questionTypeDraft(),
      content: 'Deneme sorusu - beklenen en az on karakter',
      grade: '8. Sınıf', projectId: 1,
      options: ['11', '18', '22', '28'], correctAnswer: 'C', assets: [], explanation: ''
    };
    expect(() => toP2SandboxLegacyDraft({ ...draft, questionType: 'TRUE_FALSE' })).toThrow();
    expect(() => toP2SandboxLegacyDraft({ ...draft, questionType: 'OPEN_ENDED' })).toThrow();
    expect(() => toP2SandboxLegacyDraft(draft)).not.toThrow();
  });
});
