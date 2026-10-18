import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { projectQuestionStats } from '../src/projects/integration';
import { canSeeProjectFinance } from '../src/projects/ProjectProductionOverview';
import type { ApiQuestion } from '../src/questions/types';

const overview = readFileSync(resolve('src/projects/ProjectProductionOverview.tsx'), 'utf8');
const demo = readFileSync(resolve('src/DemoApp.tsx'), 'utf8');

describe('Project → Question Studio → Compensation production overview', () => {
  it('counts all five workflow states only for the selected project', () => {
    const statuses = ['TASLAK','INCELEMEDE','REVIZYON','ONAYLANDI','REDDEDILDI'];
    const questions = statuses.map((status, id) => ({ id, status, projectId: 17 }))
      .concat([{ id: 99, status: 'ONAYLANDI', projectId: 27 }]);
    expect(projectQuestionStats(17, questions as ApiQuestion[])).toEqual({
      total: 5, draft: 1, review: 1, revision: 1, approved: 1, rejected: 1
    });
  });

  it('shows finance only to general coordinator and accounting roles', () => {
    expect(canSeeProjectFinance('GENEL_KOORDINATOR')).toBe(true);
    expect(canSeeProjectFinance('MUHASEBE')).toBe(true);
    for (const role of ['YAZAR','EDITOR','IL_KOORDINATORU','BOLGE_KOORDINATORU'] as const) {
      expect(canSeeProjectFinance(role)).toBe(false);
    }
  });

  it('loads ONLY this project ledger on demand, without aggregating payment records twice', () => {
    expect(overview).toContain('fetchCompensationSummary([projectId])');
    expect(overview).toContain('if (!financeAllowed)');
    expect(overview).toContain('summary.waiting');
    expect(overview).toContain('summary.inProcess');
    expect(overview).toContain('summary.paid');
    expect(overview).toContain('summary.total');
    expect(overview).not.toContain('fetchPayments(');
    expect(overview).toContain('İptal edilen kazanımlar toplam dışıdır');
  });

  it('does not silently render previous project earnings after changing project or role', () => {
    expect(overview).toContain('let active = true');
    expect(overview).toContain('if (active) setSummary(value)');
    expect(overview).toContain('setSummary(null)');
    expect(overview).toContain('return () => { active = false; };');
    expect(overview).toContain('[projectId, financeAllowed]');
    expect(overview).toContain('role="alert"');
  });

  it('integrates as read-only project detail with existing scoped question navigation', () => {
    expect(demo).toContain('<ProjectProductionOverview');
    expect(demo).toContain('projectId={selectedProject.id}');
    expect(demo).toContain('questions={apiQuestions}');
    expect(demo).toContain('questionsError={apiError}');
    expect(demo).toContain('role={currentUser.role}');
    expect(demo).toContain('onOpenQuestions={() => openQuestionsForProject(selectedProject.id)}');
    expect(overview).not.toContain('method: \'POST\'');
    expect(overview).not.toContain('method: \'PATCH\'');
    expect(overview).not.toContain('method: \'DELETE\'');
  });
});
