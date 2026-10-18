import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const app = readFileSync(new URL('../src/DemoApp.tsx', import.meta.url), 'utf8');
const start = app.indexOf('const saveEditorReview = async (event: React.FormEvent)');
const end = app.indexOf('const handleYazarSubmit = async', start);
const handler = app.slice(start, end);
const modalStart = app.indexOf('{reviewingQuestion &&');
const modalEnd = app.indexOf('{showProjectManager &&', modalStart);
const modal = app.slice(modalStart, modalEnd);

describe('P2 editor decision progress and duplicate-submit guard', () => {
  it('blocks rapid duplicate submissions before React state can update', () => {
    expect(start).toBeGreaterThan(-1);
    expect(handler).toContain('if (!reviewingQuestion || !reviewAction || reviewSavingRef.current) return;');
    expect(handler).toContain('reviewSavingRef.current = true;');
    expect(handler).toContain('setReviewSaving(true);');
    expect(handler).toContain('await runQuestionWorkflow(reviewingQuestion.id, reviewAction, editorNote.trim() || undefined);');
    expect(handler).toContain('finally {\n      reviewSavingRef.current = false;\n      setReviewSaving(false);');
  });

  it('keeps the review and the editor note available after an error', () => {
    expect(handler).toContain("setReviewSaveError(e?.status === 409");
    expect(handler).not.toContain('setReviewingQuestion(null);\n    } catch');
    const catchBlock = handler.slice(handler.indexOf('} catch (e: any) {'), handler.indexOf('} finally {'));
    expect(catchBlock).not.toContain('setReviewingQuestion(null)');
    expect(catchBlock).not.toContain("setEditorNote('')");
    expect(modal).toContain('role="alert">{reviewSaveError}</p>');
  });

  it('locks editing, closing and submission controls while pending', () => {
    expect(modal).toContain('onSubmit={saveEditorReview} aria-busy={reviewSaving}');
    expect(modal).toContain('event.target === event.currentTarget && !reviewSavingRef.current');
    expect(modal).toContain('disabled={reviewSaving} onClick={() => { if (!reviewSavingRef.current) setReviewingQuestion(null); }}');
    expect(modal).toContain('<label>Aksiyon<select required value={reviewAction} disabled={reviewSaving}');
    expect(modal).toContain('<textarea maxLength={600} value={editorNote} disabled={reviewSaving}');
    expect(modal).toContain('disabled={!reviewAction || reviewSaving}');
    expect(modal).toContain("reviewSaving ? 'Kaydediliyor…' : 'Kararı Kaydet'");
    expect(modal).toContain('role="status">Editör kararı kaydediliyor; lütfen bekleyin.');
    expect(modal).not.toContain('closeQuestionForm()');
  });
});
