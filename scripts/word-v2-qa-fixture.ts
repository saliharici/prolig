import { mkdirSync, writeFileSync } from 'node:fs';
import { exportBookDocx, type DocxBook } from '../api/v1/_lib/book-docx.js';
import type { FrozenBookQuestionV1 } from '../src/publishing/book-draft-contract.js';

function question(id: number, content: string, correctAnswer: string): FrozenBookQuestionV1 {
  return {
    schemaVersion: 1, sourceQuestionId: id, sourceQuestionUpdatedAt: '2026-10-20T00:00:00.000Z',
    content, imageUrl: null, grade: '9. Sınıf', objectiveCode: null, difficulty: null,
    questionType: 'MULTIPLE_CHOICE',
    options: ['2', '3', '4', '5'], correctAnswer,
    booleanAnswer: null, modelAnswer: null, explanation: null,
    scoringRubric: null, evaluationCriteria: null, authorName: 'PRO-LIG', assets: []
  };
}

const book: DocxBook = {
  id: 9999, title: 'PRO-LİG | Word V2 Dizgi İncelemesi', layoutColumns: 2,
  chapters: [
    { title: 'Bölüm 1 · Cebir ve Sayılar', sortOrder: 0, questions: [
      { sortOrder: 0, snapshot: question(1, 'Denklemi çözünüz: $x + 2 = 5$', 'B') },
      { sortOrder: 1, snapshot: question(2, 'Kesir: $\\frac{1}{2}$', 'A') },
      { sortOrder: 2, snapshot: question(3, 'Kök: $\\sqrt{9}$', 'B') },
      { sortOrder: 3, snapshot: question(4, 'Üs: $x^2$', 'C') }
    ]}
  ]
};
mkdirSync('artifacts/word-v2-qa', { recursive: true });
for (const [answers, filename] of [
  [false, 'PROLIG_Word_V2_Gercek_Motor_Ogrenci.docx'],
  [true, 'PROLIG_Word_V2_Gercek_Motor_Cevapli.docx']
] as const) {
  const result = exportBookDocx(book, answers);
  writeFileSync('artifacts/word-v2-qa/' + filename, result);
  console.log(filename + ': ' + result.length + ' bytes');
}
