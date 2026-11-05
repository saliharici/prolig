/** RELEASE-08 AI Editor 1.0: advisory-only response contract. No persistence format changes. */
export const AI_REVIEW_CATEGORIES = [
  'academic', 'answer_key', 'language', 'distractors', 'mathematics', 'geometry'
] as const;
export type AiReviewCategory = typeof AI_REVIEW_CATEGORIES[number];
export type AiReviewSeverity = 'critical' | 'major' | 'minor' | 'info';
export type AiReviewExpert = 'question_reviewer' | 'editorial_assistant';
export type AiReviewField = 'content' | 'explanation' | 'optionA' | 'optionB' | 'optionC' | 'optionD' | 'optionE';
export interface AiReviewEdit {
  field: AiReviewField;
  before: string;
  after: string;
}
export interface AiReviewIssue {
  category: AiReviewCategory;
  severity: AiReviewSeverity;
  expert: AiReviewExpert;
  explanation: string;
  suggestion: string;
  edit?: AiReviewEdit;
}
export interface AiReviewReport {
  summary: string;
  issues: AiReviewIssue[];
  reviewedUpdatedAt: string;
  model: string;
  advisoryOnly: true;
}
const isRecord = (x: unknown): x is Record<string, unknown> =>
  x !== null && typeof x === 'object' && !Array.isArray(x);
const textValue = (x: unknown, limit: number): string =>
  typeof x === 'string' ? x.trim().slice(0, limit) : '';
const categories: ReadonlyArray<string> = AI_REVIEW_CATEGORIES;
const severities = ['critical','major','minor','info'];
const experts = ['question_reviewer','editorial_assistant'];
const fields = ['content','explanation','optionA','optionB','optionC','optionD','optionE'];

/** Defensive schema validation: provider JSON is untrusted data, never commands. */
export function parseAiReviewReport(raw: unknown): Pick<AiReviewReport, 'summary' | 'issues'> {
  if (!isRecord(raw) || !Array.isArray(raw.issues) || raw.issues.length > 15)
    throw new Error('INVALID_AI_REVIEW_OUTPUT');
  const summary = textValue(raw.summary, 700);
  if (!summary) throw new Error('INVALID_AI_REVIEW_OUTPUT');
  const issues: AiReviewIssue[] = raw.issues.slice(0, 8).map(item => {
    if (!isRecord(item) || !categories.includes(String(item.category)) ||
        !severities.includes(String(item.severity)) || !experts.includes(String(item.expert)))
      throw new Error('INVALID_AI_REVIEW_OUTPUT');
    const explanation = textValue(item.explanation, 700);
    const suggestion = textValue(item.suggestion, 700);
    if (!explanation || !suggestion) throw new Error('INVALID_AI_REVIEW_OUTPUT');
    const issue: AiReviewIssue = {
      category: item.category as AiReviewCategory,
      severity: item.severity as AiReviewSeverity,
      expert: item.expert as AiReviewExpert, explanation, suggestion
    };
    if (isRecord(item.edit) && fields.includes(String(item.edit.field))) {
      const before = textValue(item.edit.before, 200);
      const after = textValue(item.edit.after, 200);
      // Avoid formatting, equation or geometry token edits in release 1.
      if (before.length >= 5 && after && before !== after &&
          !/[\\$<>\[\]{}\r\n]/.test(before + after)) {
        issue.edit = { field: item.edit.field as AiReviewField, before, after };
      }
    }
    return issue;
  });
  return { summary, issues };
}

/** Only an exact single occurrence of prose can change the LOCAL draft. Never rewrite markup. */
export function applyAiReviewEdit(current: string, edit: AiReviewEdit): string | null {
  if (typeof current !== 'string' || current.length > 2500 ||
      edit.before.length < 5 || edit.after.length < 1 || edit.before.length > 200 ||
      edit.after.length > 200 || /[\\$<>\[\]{}\r\n]/.test(edit.before + edit.after)) return null;
  const at = current.indexOf(edit.before);
  if (at < 0 || current.indexOf(edit.before, at + edit.before.length) !== -1) return null;
  // Never edit inside a markup token (e.g. the $...$ math or [geometry] encoding).
  const segments = /\$[^$]*\$|<[^>]*>|\[[^\]]*\]|\\[a-zA-Z]+\{[^}]*\}/g;
  for (const match of current.matchAll(segments)) {
    const start = match.index ?? 0;
    if (at < start + match[0].length && at + edit.before.length > start) return null;
  }
  return current.slice(0, at) + edit.after + current.slice(at + edit.before.length);
}
