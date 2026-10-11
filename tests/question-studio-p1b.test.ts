import { describe, expect, it } from 'vitest';
import { questionStudioFingerprint, type QuestionStudioFormValues } from '../src/questions/studio-state';
import fs from 'node:fs';
import path from 'node:path';

const empty: QuestionStudioFormValues = {
  content: '', level: 'Ortaokul', grade: '8. Sınıf', projectId: null,
  options: ['', '', '', ''], correctAnswer: 'A', explanation: '', assets: [],
  assetPlacement: 'STEM', assetType: 'IMAGE', assetUrl: '', assetTitle: '', assetAltText: ''
};

describe('P1-B in-memory draft safety', () => {
  it('produces same fingerprint for equivalent form values without mutating them', () => {
    const snapshot = structuredClone(empty);
    expect(questionStudioFingerprint(empty)).toBe(questionStudioFingerprint(snapshot));
    expect(empty).toEqual(snapshot);
  });

  it.each([
    ['content', 'Geometri sorusu'],
    ['grade', '9. Sınıf'],
    ['level', 'Lise'],
    ['projectId', 42],
    ['correctAnswer', 'D'],
    ['explanation', 'Çözüm adımları'],
    ['assetPlacement', 'OPTION_A'],
    ['assetType', 'LINK'],
    ['assetUrl', 'https://example.com'],
    ['assetTitle', 'Şekil'],
    ['assetAltText', 'Kare şekli']
  ] as const)('detects dirty change to %s', (field, value) => {
    expect(questionStudioFingerprint({ ...empty, [field]: value })).not.toBe(questionStudioFingerprint(empty));
  });

  it('detects option edits and media additions', () => {
    expect(questionStudioFingerprint({ ...empty, options: ['A', '', '', ''] })).not.toBe(questionStudioFingerprint(empty));
    expect(questionStudioFingerprint({
      ...empty,
      assets: [{ placement: 'STEM', assetType: 'IMAGE', url: 'https://example.com/p.png', altText: 'Örnek' }]
    })).not.toBe(questionStudioFingerprint(empty));
  });

  it('preserves old API and protects form on HTTP 409 rather than reopening with server values', () => {
    const app = fs.readFileSync(path.join(process.cwd(), 'src/DemoApp.tsx'), 'utf8');
    const saving = app.slice(app.indexOf('const handleCreateQuestion'), app.indexOf('const openQuestionForm'));
    expect(saving).toContain('questionSavingRef.current = true');
    expect(saving).toContain('if (e instanceof ApiError && e.status === 409)');
    expect(saving).toContain('setQuestionSaveError(');
    expect(saving).not.toContain('openYazarEdit(latestQuestion)');
    expect(saving).not.toContain('const latestQuestions = await loadApiQuestions()');
    expect(app).toContain('hasUnsavedQuestionChanges');
    expect(app).toContain('window.confirm(');
    expect(app).toContain('onClick={closeQuestionForm}');
    expect(app).toContain('question-workspace-overlay');
    expect(app).toContain("import.meta.env.VITE_QUESTION_STUDIO_P1 === 'true'");
  });

  it('scopes fullscreen overrides to P1 opt-in workspace only', () => {
    const css = fs.readFileSync(path.join(process.cwd(), 'src/questions/studio-workspace.css'), 'utf8');
    const app = fs.readFileSync(path.join(process.cwd(), 'src/DemoApp.tsx'), 'utf8');
    expect(app).toContain("import './questions/studio-workspace.css'");
    expect(css).toContain('.question-studio-workspace');
    expect(css).toContain('.question-workspace-overlay');
    expect(css).toContain('@media(max-width:640px)');
    expect(app).toContain("import.meta.env.VITE_QUESTION_STUDIO_P1 === 'true' ? 'question-modal");
  });
});
