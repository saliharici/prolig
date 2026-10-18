import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const studio = readFileSync(new URL('../src/questions/GuidedQuestionStudio.tsx', import.meta.url), 'utf8');
const baseCss = readFileSync(new URL('../src/questions/guided-question-studio.css', import.meta.url), 'utf8');
const publisherCss = readFileSync(new URL('../src/theme/publisher-real-ui.css', import.meta.url), 'utf8');

describe('P2 guided authoring readiness UX', () => {
  it('derives step readiness from the existing review issues without changing validation', () => {
    expect(studio).toContain('const readyStageCount = [1, 2, 3, 4].filter');
    expect(studio).toContain('const activeIssues = issues.filter(issue => issue.step === step);');
    expect(studio).toContain('const issues = guidedQuestionIssues(v);');
    expect(studio).toContain('<progress max={4} value={readyStageCount} aria-label="İnceleme hazırlığı" />');
    expect(studio).toContain('aria-label="Bu aşamanın kontrol listesi"');
    expect(studio).toContain('activeIssues.map(issue => <li key={issue.message}>');
  });

  it('tells the author readiness is informational and preserves draft-save semantics', () => {
    expect(studio).toContain('taslak kaydetme ve gönderim kuralları değişmez.');
    expect(studio).toContain('Taslak kaydı incelemeye göndermez.');
    expect(studio).toContain('onStepChange(step + 1)');
    expect(studio).not.toContain('disabled={activeIssues.length > 0}');
  });

  it('labels the optional live preview and keeps the Publisher Edition styling scoped', () => {
    expect(studio).toContain('aria-label="İsteğe bağlı önizleme"');
    expect(studio).toContain('Canlı soru önizlemesi');
    expect(studio).toContain('Yalnız görüntüleme; kayıt işlemi yapılmaz.');
    expect(baseCss).toContain('.p2-progress-summary');
    expect(baseCss).toContain('.p2-live-preview-heading');
    expect(publisherCss).toContain('.publisher-theme.corporate-workspace-v3 .p2-active-checklist');
  });
});
