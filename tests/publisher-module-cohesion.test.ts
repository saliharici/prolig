import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (name: string) => readFileSync(new URL('../' + name, import.meta.url), 'utf8');

describe('Publisher Edition / phase 2 module & question editing skin', () => {
  const css = read('src/theme/publisher-real-ui.css');
  const app = read('src/DemoApp.tsx');

  it('styles every real publishing workspace without unscoped global overrides', () => {
    const modules = [
      '.question-view-toggle', '.row-actions', '.editor-review-modal',
      '.question-preview-card',
      '.corporate-project-summary', '.task-kanban-column',
      '.message-row', '.announcement-card', '.reports-filter-panel',
      '.report-bar-row', '.payment-module-tabs', '.compensation-rule-form',
      '.member-form-card'
    ];
    for (const name of modules) {
      expect(css, name).toContain('.publisher-theme.corporate-workspace-v3 ' + name);
    }
    expect(css).toContain('.publisher-theme.corporate-workspace-v3 .question-studio-modal .question-editor-toolbar');
    expect(css).toContain('PUBLISHER EDITION PHASE 2 / REAL CONTENT & REVIEW');
  });

  it('retains actual draft-edit, editor-review and question permissions', () => {
    expect(app).toContain('onClick={() => openYazarEdit(q)}');
    expect(app).toContain('onClick={() => handleYazarSubmit(q)}');
    expect(app).toContain('onClick={() => openEditorReview(q)}');
    expect(app).toContain("['TASLAK', 'REVIZYON'].includes(q.status)");
    expect(app).toContain("q.status === 'INCELEMEDE'");
    expect(app).toContain("editingQuestion ? 'Soruyu Düzenle' : 'Yeni soru taslağı'");
    expect(app).toContain('<GuidedQuestionStudio');
    expect(app).toContain('originalProjectId={originalQuestionProjectId}');
    expect(app).toContain('role === \'YAZAR\'');
  });

  it('does not change API and financial workflow through the presentation theme', () => {
    const themeAppGating = read('src/main.tsx');
    expect(themeAppGating).toContain("import './theme/publisher-real-ui.css'");
    expect(app).toContain("import.meta.env.VITE_PUBLISHER_PRESENTATION_THEME === 'true'");
    expect(css).not.toMatch(/DATABASE_URL|AUTH_SECRET|authorization:/i);
    expect(css).not.toMatch(/display:\\s*none\\s*!important\\s*;[^}]*\\.modal-actions/);
  });
});
