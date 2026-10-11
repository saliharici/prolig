import { describe, expect, it } from 'vitest';
import { questionStudioFingerprint, pausedQuestionDraftKey, copyPausedQuestionDraft, copyQuestionStudioValues, type QuestionStudioFormValues } from '../src/questions/studio-state';
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

  it('keeps distinct pause slots for different authors and question ids', () => {
    expect(pausedQuestionDraftKey(1, null)).not.toBe(pausedQuestionDraftKey(2, null));
    expect(pausedQuestionDraftKey(1, null)).not.toBe(pausedQuestionDraftKey(1, 42));
    expect(pausedQuestionDraftKey(1, 42)).not.toBe(pausedQuestionDraftKey(1, 43));
    expect(pausedQuestionDraftKey(1, 42)).toBe('1:question:42');
  });

  it('copies all options and media objects before retaining an in-memory draft', () => {
    const original = {
      values: {
        ...empty, content: 'İstanbul soru taslağı', options: ['a', 'b', 'c', 'd'],
        assets: [{ placement: 'STEM' as const, assetType: 'IMAGE' as const, url: 'https://example.com/a.png', altText: 'A şekli' }]
      },
      baseline: questionStudioFingerprint(empty),
      originalProjectId: null,
      originalQuestion: null
    };
    const copy = copyPausedQuestionDraft(original);
    original.values.options[0] = 'changed';
    original.values.assets[0].url = 'https://example.com/b.png';
    expect(copy.values.options[0]).toBe('a');
    expect(copy.values.assets[0].url).toBe('https://example.com/a.png');
    expect(copyPausedQuestionDraft(copy)).toEqual(copy);
    expect(copyQuestionStudioValues(copy.values)).not.toBe(copy.values);
  });

  it('retains paused form and restores every field on reopening while keeping cancel in the editor', () => {
    const app = fs.readFileSync(path.join(process.cwd(), 'src/DemoApp.tsx'), 'utf8');
    const capture = app.slice(app.indexOf('const closeQuestionForm ='), app.indexOf('const questionAssignableProjects ='));
    const newOpen = app.slice(app.indexOf('const openQuestionForm ='), app.indexOf('const changeQuestionLevel ='));
    const editOpen = app.slice(app.indexOf('const openYazarEdit ='), app.indexOf('const updatePayment ='));
    const restore = app.slice(app.indexOf('const restorePausedQuestion ='), app.indexOf('const closeQuestionForm ='));
    expect(capture).toContain('if (!window.confirm(');
    expect(capture).toContain('pausedQuestionDraftsRef.current.set(pausedQuestionKey, copyPausedQuestionDraft(');
    expect(capture).toContain('if (hasUnsavedQuestionChanges)');
    expect(newOpen).toContain('restorePausedQuestion(copyPausedQuestionDraft(paused))');
    expect(editOpen).toContain('restorePausedQuestion(copyPausedQuestionDraft(paused))');
    expect(restore).toContain('setQuestionOptions([...values.options])');
    expect(restore).toContain('setQuestionCorrectAnswer(values.correctAnswer)');
    expect(restore).toContain('setQuestionAssets(values.assets.map(');
    expect(restore).toContain('setQuestionBaseline(draft.baseline)');
    expect(app).toContain("hasUnsavedQuestionChanges ? 'Ara ver' : 'Vazgeç'");
    expect(app).not.toContain('localStorage.setItem(');
    expect(app).not.toContain('sessionStorage.setItem(');
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
    expect(app).toContain("window.addEventListener('beforeunload', warnBeforeUnload)");
    expect(app).toContain("window.removeEventListener('beforeunload', warnBeforeUnload)");
    expect(app).toContain('onClick={closeQuestionForm}');
    expect(app).toContain('question-workspace-overlay');
    expect(app).toContain('inert={questionSaving} aria-busy={questionSaving}');
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
