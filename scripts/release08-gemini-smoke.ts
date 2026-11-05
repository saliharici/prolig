/**
 * RELEASE-08 real Gemini smoke (no database, no records, one synthetic question).
 * Run only with GEMINI_API_KEY set in a local process environment.
 * Produces a real provider response, never a mock.
 */
import { reviewStoredQuestion } from '../api/v1/_lib/ai-editor.js';
async function main(): Promise<void> {
  if (!process.env.GEMINI_API_KEY) {
    process.stderr.write('GEMINI_SMOKE=BLOCKED; server-only GEMINI_API_KEY is not configured.\n');
    process.exitCode = 2;
    return;
  }
  process.env.AI_REVIEW_PROVIDER = 'google';
  process.env.AI_REVIEW_MODEL = process.env.AI_REVIEW_MODEL || 'gemini-3.6-flash';
  try {
    const report = await reviewStoredQuestion({
      content: 'RELEASE-08 sentetik deneme: 2 + 3 işleminin sonucu kaçtır?',
      options: ['4', '5', '6', '7'],
      correctAnswer: 'B',
      explanation: '2 + 3 = 5, doğru cevap B seçeneğidir.',
      questionType: 'MULTIPLE_CHOICE',
      grade: '5. Sınıf',
      objectiveCode: null,
      difficulty: 'Kolay',
      booleanAnswer: null,
      modelAnswer: null,
      scoringRubric: null,
      evaluationCriteria: null
    }, new Date('2026-11-05T00:00:00.000Z'));
    if (report.advisoryOnly !== true || !report.summary.trim() || !Array.isArray(report.issues))
      throw new Error('INVALID_AI_REVIEW_OUTPUT');
    // Never output provider secrets, raw response or the question body.
    process.stdout.write('GEMINI_SMOKE=PASS\n');
    process.stdout.write('MODEL=' + report.model + '\n');
    process.stdout.write('STRUCTURED_REPORT=true\n');
    process.stdout.write('ISSUES=' + report.issues.length + '\n');
    process.stdout.write('CATEGORIES=' + report.issues.map(x => x.category).join(',') + '\n');
  } catch {
    // Provider SDK errors can contain request information. Never echo raw errors.
    process.stderr.write('GEMINI_SMOKE=FAIL; provider or structured-response validation failed.\n');
    process.exitCode = 1;
  }
}
void main();
