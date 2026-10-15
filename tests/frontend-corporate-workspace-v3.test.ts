import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/DemoApp.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/workspace/corporate-workspace-v3.css', import.meta.url), 'utf8');

describe('Corporate workspace Phase 3A', () => {
  it('scopes corporate styling to authenticated workspace only', () => {
    expect(app).toContain('demo-shell corporate-workspace-v3');
    expect(app).toContain("import.meta.env.VITE_PUBLISHER_PRESENTATION_THEME === 'true'");
    expect(app).toContain("import './workspace/corporate-workspace-v3.css'");
    expect(styles).toContain('.corporate-workspace-v3 .topbar');
    expect(styles).not.toMatch(/(^|\n)\s*body\s*\{/);
  });

  it('keeps existing role based menu and search wiring', () => {
    expect(app).toContain('allowed.includes(id)');
    expect(app).toContain('onSubmit={runTopbarSearch}');
    expect(app).toContain('onClick={() => navigate(id)}');
  });

  it('offers a role-appropriate and non-dead overview action', () => {
    expect(app).toContain('workspace-overview-actions');
    expect(app).toContain("currentUser.role === 'YAZAR' || currentUser.role === 'EDITOR' ? 'questions' : 'projects'");
    expect(app).toContain("allowed.includes('roles') ? 'roles' : 'questions'");
  });

  it('keeps empty table headers hidden, blocks misleading empty states while loading, and standardizes KPI numbers', () => {
    expect(app).toContain('!apiLoading && !apiError && <div className="table-wrap">{filteredQuestions.length > 0 && <table>');
    expect(app).toContain('</tbody></table>}{filteredQuestions.length === 0 && <div className="empty-state workspace-question-empty">');
    expect(app).not.toContain("padStart(2, '0')");
    expect(styles).toContain('.workspace-question-empty .primary-button svg');
  });

  it('does not present mock activity as real or mislabel empty question filters', () => {
    expect(app).toContain('Örnek hareketler — doğrulanmış işlem geçmişi değildir.');
    expect(app).toContain('Henüz soru hareketi yok');
    expect(app).toContain('Soru havuzu henüz boş');
    expect(app).toContain('Bu ölçütlere uygun soru bulunamadı');
  });
});
