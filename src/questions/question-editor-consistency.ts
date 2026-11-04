/** Shared, side-effect-free question editor normalization. No DB or remote writes. */
import { allowsFiveOptions } from '../../shared/question-contract';

export type ChoiceCount = 4 | 5;

/** A new multiple-choice question must always have every editable choice slot. */
export function blankQuestionOptions(count: ChoiceCount = 4): string[] {
  return Array.from({ length: count }, () => '');
}

/** Extends malformed/legacy short drafts without dropping an entered D or E choice. */
export function setQuestionOption(
  options: readonly string[],
  index: number,
  value: string,
  count: ChoiceCount = 4
): string[] {
  if (!Number.isInteger(index) || index < 0 || index >= count) {
    throw new RangeError(`Invalid option index ${index} for ${count} choices`);
  }
  return Array.from({ length: count }, (_, i) => i === index ? value : (options[i] ?? ''));
}

/** When switching to a lower grade, never leave an invalid 5-choice draft. */
export function personalGradeSelection(
  previous: { optionCount: ChoiceCount; correctAnswer: string },
  grade: string
): { grade: string; optionCount: ChoiceCount; correctAnswer: string } {
  if (previous.optionCount === 5 && !allowsFiveOptions(grade)) {
    return {
      grade,
      optionCount: 4,
      correctAnswer: previous.correctAnswer === 'E' ? '' : previous.correctAnswer
    };
  }
  return { grade, optionCount: previous.optionCount, correctAnswer: previous.correctAnswer };
}
