import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const app = readFileSync(new URL('../src/DemoApp.tsx', import.meta.url), 'utf8');
const theme = readFileSync(new URL('../src/theme/publisher-real-ui.css', import.meta.url), 'utf8');
const handlerStart = app.indexOf('const handleYazarSubmit = async (question: ApiQuestion) => {');
const handlerEnd = app.indexOf('const openYazarEdit = (question: ApiQuestion)', handlerStart);
const handler = app.slice(handlerStart, handlerEnd);
const tableStart = app.indexOf('filteredQuestions.map(q => {');
const tableEnd = app.indexOf('})}</tbody></table>', tableStart);
const table = app.slice(tableStart, tableEnd);

describe('Author submission and editor revision UX', () => {
  it('guards rapid duplicate submit of the same question before React state updates', () => {
    expect(handlerStart).toBeGreaterThan(-1);
    expect(handlerEnd).toBeGreaterThan(handlerStart);
    expect(app).toContain('const authorSubmitPendingRef = useRef(new Set<number>());');
    expect(handler).toContain("authorSubmitPendingRef.current.has(question.id)) return;");
    expect(handler.indexOf('authorSubmitPendingRef.current.add(question.id);'))
      .toBeLessThan(handler.indexOf("await runQuestionWorkflow(question.id, 'submit');"));
    expect(handler).toContain('setAuthorSubmittingIds(Array.from(authorSubmitPendingRef.current));');
    expect(handler).toContain('finally {\n      authorSubmitPendingRef.current.delete(question.id);');
    expect(handler).toContain("!['TASLAK', 'REVIZYON'].includes(question.status)");
  });

  it('shows explicit pending and failure feedback without reissuing the workflow request', () => {
    expect(table).toContain('const authorSubmitting = authorSubmittingIds.includes(q.id);');
    expect(table).toContain('disabled={authorSubmitting} aria-busy={authorSubmitting}');
    expect(table).toContain("authorSubmitting ? 'Gönderiliyor…'");
    expect(handler).toContain("await runQuestionWorkflow(question.id, 'submit');");
    expect(handler.match(/runQuestionWorkflow\(question\.id, 'submit'\)/g)).toHaveLength(1);
    expect(handler).toContain('setAuthorSubmitError({ questionId: question.id, message });');
    expect(table).toContain('role="alert">{authorSubmissionError}</p>');
  });

  it('displays full revision notes for authors and guides resubmission', () => {
    expect(table).toContain("q.status === 'REVIZYON' && currentUser.role === 'YAZAR'");
    expect(table).toContain('aria-label="Editör revizyon geri bildirimi"');
    expect(table).toContain('q.editorNote?.trim()');
    expect(table).toContain('Notu inceleyin, düzenlemelerinizi kaydedin ve soruyu yeniden gönderin.');
    expect(table).toContain("q.status === 'REVIZYON' ? 'Yeniden incelemeye gönder' : 'İncelemeye gönder'");
    expect(table).toContain('onClick={() => openYazarEdit(q)}');
    expect(table).not.toContain('dangerouslySetInnerHTML');
    expect(theme).toContain('.question-revision-feedback');
    expect(theme).toContain('white-space: pre-wrap;');
  });

  it('does not change question workflow API contracts or financial approval behavior', () => {
    expect(handler).toContain("currentUser.role !== 'YAZAR'");
    expect(handler).toContain('question.isArchived');
    expect(handler).not.toContain("'approve'");
    expect(handler).not.toContain('payPayment(');
    expect(handler).toContain('if (e?.status === 409) await loadApiQuestions();');
  });
});
