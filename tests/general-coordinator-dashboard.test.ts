import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { overdueProjects, reviewQueue, topAuthorProductivity } from '../src/overview/coordinator-analytics';
import { parseKurus, formatKurus } from '../src/reports/author-performance';
import type { ApiProject } from '../src/projects/types';
import type { ApiQuestion } from '../src/questions/types';
import type { AuthorPerformanceReportRow } from '../src/reports/author-performance';

const project = (id: number, deadline: string, status = 'Devam_Ediyor') =>
  ({ id, title: `Proje ${id}`, deadline, status, branch: { name: 'Matematik' } }) as ApiProject;
const question = (id: number, status: string, updatedAt: string, isArchived = false) =>
  ({ id, status, updatedAt, isArchived }) as ApiQuestion;
const authorRow = (projectId: number, userId: number, approved: number, total: number): AuthorPerformanceReportRow =>
  ({
    projectId, userId, authorName: userId === 1 ? 'Aylin' : 'Bekir',
    projectCode: 'TEST', projectTitle: 'Test', branchId: 1, branchName: 'Matematik',
    grade: '8. Sınıf', provinceId: 25, provinceName: 'Erzurum',
    counts: { total, approved, draft: total - approved, review: 0, revision: 0, rejected: 0 }
  });

const ui = readFileSync(resolve('src/overview/GeneralCoordinatorDashboard.tsx'), 'utf8');
const demo = readFileSync(resolve('src/DemoApp.tsx'), 'utf8');

describe('General coordinator operational summary — scoped, read-only', () => {
  it('marks only unfinished projects with deadlines strictly before local calendar day as late', () => {
    const now = new Date('2026-10-18T14:30:00');
    const result = overdueProjects([
      project(1, '2026-10-17T00:00:00.000Z'),
      project(2, '2026-10-18T00:00:00.000Z'),
      project(3, '2026-10-10T00:00:00.000Z', 'Tamamlandi'),
      project(4, '2026-10-01T00:00:00.000Z', 'Arsiv'),
      project(5, '2026-10-19T00:00:00.000Z'),
      project(6, '2026-10-15T00:00:00.000Z', 'Kontrol'),
      project(7, 'not-a-date')
    ], now);
    expect(result.map(item => [item.project.id, item.overdueDays]))
      .toEqual([[6, 3], [1, 1]]);
  });

  it('ignores invalid dates and years for the deadline calculation', () => {
    expect(overdueProjects([
      project(1, '2026-02-30'), project(2, ''), project(3, 'unavailable')
    ], new Date('2026-10-18T12:00:00'))).toEqual([]);
  });

  it('shows only in-review nonarchived questions, ordered by last update (not submission)', () => {
    const results = reviewQueue([
      question(7, 'INCELEMEDE', '2026-10-17T17:00:00.000Z'),
      question(3, 'INCELEMEDE', '2026-10-15T17:00:00.000Z'),
      question(2, 'INCELEMEDE', '2026-10-16T17:00:00.000Z', true),
      question(4, 'REVIZYON', '2026-10-14T17:00:00.000Z'),
      question(8, 'ONAYLANDI', '2026-10-11T17:00:00.000Z')
    ]);
    expect(results.map(item => item.id)).toEqual([3, 7]);
  });

  it('combines the same writer across projects without counting duplicate project-author rows', () => {
    const scored = topAuthorProductivity([
      authorRow(1, 1, 2, 3),
      authorRow(2, 1, 3, 4),
      authorRow(1, 1, 2, 3),
      authorRow(1, 2, 4, 6)
    ]);
    expect(scored.map(({ userId, approved, total, projectCount }) => ({
      userId, approved, total, projectCount
    }))).toEqual([
      { userId: 1, approved: 5, total: 7, projectCount: 2 },
      { userId: 2, approved: 4, total: 6, projectCount: 1 }
    ]);
  });

  it('preserves exact kuruş when calculating overdue obligations', () => {
    const unpaid = parseKurus('12.20') + parseKurus('13.03');
    expect(unpaid).toBe(2523n);
    expect(formatKurus(unpaid)).toContain('25,23');
  });

  it('uses only backend aggregate APIs for author and financial data, never writes', () => {
    expect(ui).toContain('fetchAuthorPerformanceReport()');
    expect(ui).toContain('fetchCompensationSummary()');
    expect(ui).toContain('formatKurus(parseKurus(fees.waiting) + parseKurus(fees.inProcess))');
    expect(ui).not.toContain('method: \'POST\'');
    expect(ui).not.toContain('method: \'PATCH\'');
    expect(ui).not.toContain('method: \'DELETE\'');
  });

  it('does not display stale financial or author data across authenticated accounts', () => {
    expect(ui).toContain("role === 'GENEL_KOORDINATOR'");
    expect(ui).toContain('if (!authorized)');
    expect(ui).toContain('let active = true');
    expect(ui).toContain('if (active) setFees(result)');
    expect(ui).toContain('if (active) setAuthorReport(result)');
    expect(ui).toContain('return () => { active = false; };');
    expect(ui).toContain('[authorized, userId]');
    expect(demo).toContain("currentUser.role === 'GENEL_KOORDINATOR' && <GeneralCoordinatorDashboard");
    expect(demo).toContain('key={currentUser.id}');
  });

  it('preserves existing guarded navigation and makes pending review filter actionable', () => {
    expect(demo).toContain("onOpenProject={(id) => { navigate('projects'); setSelectedProjectId(id); }}");
    expect(demo).toContain("onReviewQuestions={() => { navigate('questions'); setStatusFilter('İncelemede'); }}");
    expect(demo).toContain("onPayments={() => navigate('payments')}");
    expect(demo).toContain("onReports={() => navigate('reports')}");
    expect(ui).toContain('role="alert"');
  });
});
