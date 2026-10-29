import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { ApiQuestion } from '../src/questions/types';
import {
  approvedForPublishing, bookAnswer, bookMediaWarnings, moveBookQuestion, resolveBookOrder
} from '../src/publishing/book-assembly';

const app = readFileSync(new URL('../src/DemoApp.tsx', import.meta.url), 'utf8');
const model = readFileSync(new URL('../src/demo/model.ts', import.meta.url), 'utf8');
const workbench = readFileSync(new URL('../src/publishing/PublishingWorkbenchV5.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/publishing/publishing.css', import.meta.url), 'utf8');

function q(id: number, extras: Partial<ApiQuestion> = {}): ApiQuestion {
  return {
    id, content: 'Aşağıdakilerden hangisi uygundur?', imageUrl: null,
    objectiveCode: null, grade: '9. Sınıf', difficulty: null,
    options: ['Bir', 'İki', 'Üç', 'Dört'], correctAnswer: 'B',
    questionType: 'MULTIPLE_CHOICE', optionCount: 4,
    explanation: null, status: 'ONAYLANDI', editorNote: null,
    projectId: 5, project: { id: 5, code: 'P5', title: 'Test kitabı' },
    author: null, assets: [], isArchived: false,
    createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-02T00:00:00Z',
    ...extras
  };
}

describe('Publishing V1 — read-only question assembly', () => {
  it('admits only approved nonarchived scoped API questions', () => {
    const rows = [q(1), q(2, { status: 'TASLAK' }), q(3, { status: 'INCELEMEDE' }),
      q(4, { isArchived: true }), q(5), q(6, { status: 'REVIZYON' })];
    expect(approvedForPublishing(rows).map(row => row.id)).toEqual([1, 5]);
    expect(resolveBookOrder(rows, [5, 4, 1, 2, 5, 100])).toEqual([q(5), q(1)]);
    expect(resolveBookOrder(rows, [])).toEqual([]);
  });

  it('moves chosen questions only within visible order without duplicate entries', () => {
    expect(moveBookQuestion([3, 2, 1], 2, -1)).toEqual([2, 3, 1]);
    expect(moveBookQuestion([3, 2, 1], 2, 1)).toEqual([3, 1, 2]);
    expect(moveBookQuestion([3, 2, 1], 3, -1)).toEqual([3, 2, 1]);
    expect(moveBookQuestion([3, 2, 1], 1, 1)).toEqual([3, 2, 1]);
    expect(moveBookQuestion([3, 2, 1], 999, -1)).toEqual([3, 2, 1]);
  });

  it('produces separate answer keys for all P2 question types and legacy MCQs', () => {
    expect(bookAnswer(q(1))).toBe('B');
    expect(bookAnswer(q(2, { questionType: undefined, correctAnswer: 'D' }))).toBe('D');
    expect(bookAnswer(q(3, { questionType: 'TRUE_FALSE', options: [], correctAnswer: null, booleanAnswer: false }))).toBe('Yanlış');
    expect(bookAnswer(q(4, { questionType: 'TRUE_FALSE', options: [], correctAnswer: null, booleanAnswer: true }))).toBe('Doğru');
    expect(bookAnswer(q(5, { questionType: 'OPEN_ENDED', options: [], correctAnswer: null, modelAnswer: 'Örnek çözüm' }))).toBe('Örnek çözüm');
    expect(bookAnswer(q(6, { questionType: 'OPEN_ENDED', options: [], correctAnswer: null, modelAnswer: '' }))).toContain('girilm');
  });

  it('clearly warns about video/link media and TeX fidelity', () => {
    expect(bookMediaWarnings([q(1, {
      assets: [{ id: 99, assetType: 'VIDEO_URL', placement: 'STEM', url: 'https://media.example/video' }]
    })])).toEqual([expect.stringContaining('Video veya bağlantı')]);
    expect(bookMediaWarnings([q(2, { content: 'Hesaplayınız: \\(x+1\\)' })])).toEqual([expect.stringContaining('Matematik')]);
  });
});

describe('Publishing V1 — role, export and print boundaries', () => {
  it('shows the module only to general coordinator in the navigation and route', () => {
    const general = model.split('\n').find(line => line.includes("GENEL_KOORDINATOR: ['overview'"));
    expect(general).toContain("'publishing'");
    for (const role of ['BOLGE_KOORDINATORU', 'BRANS_KOORDINATORU', 'EDITOR', 'YAZAR', 'MUHASEBE']) {
      const line = model.split('\n').find(value => value.includes(role + ": ['overview'"));
      expect(line).not.toContain("'publishing'");
    }
    expect(app).toContain("section === 'publishing' && currentUser.role === 'GENEL_KOORDINATOR'");
    expect(app).toContain("id: 'publishing'");
    expect(app).toContain('<PublishingWorkbench');
  });

  it('never sends the selected book to the server and keeps student answers hidden', () => {
    expect(workbench).toContain("approvedForPublishing(questions)");
    expect(resolveBookOrder([q(1),q(2,{status:'REVIZYON'})],[2,1]).map(x=>x.id)).toEqual([1]);
    expect(workbench).toContain('const printable=Boolean(bookQuestions.length&&title.trim()&&!loading&&!error)');
    expect(workbench).toContain('window.print()');
    expect(workbench).toContain('setWithAnswerKey]=useState(false)');
    expect(workbench).toContain('withAnswerKey&&<section className="publishing-key"');
    expect(workbench).toContain('bookAnswer(q)');
    expect(workbench).toContain('publishingPreview&&<PublishingPersistencePanel');
    expect(workbench).not.toContain('localStorage');
    expect(workbench).not.toContain('dangerouslySetInnerHTML');
  });

  it('prints only the book page, not navigation or authoring controls', () => {
    expect(css).toContain('@media print');
    expect(css).toContain('.demo-shell:has(.publishing-workbench) .demo-sidebar');
    expect(css).toContain('.demo-shell:has(.publishing-workbench) .publishing-controls');
    expect(css).toContain('.publishing-page-body.two-columns');
    expect(css).toContain('break-before:page');
  });
});
