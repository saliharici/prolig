import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { blankQuestionOptions, personalGradeSelection, setQuestionOption } from '../src/questions/question-editor-consistency';
import { QuestionTypePreview } from '../src/questions/QuestionTypePreview';

describe('RELEASE-07B editor consistency — real behavior', () => {
  it('creates four real editable choice slots (not three)', () => {
    expect(blankQuestionOptions(4)).toEqual(['', '', '', '']);
  });
  it('creates all five option slots for eligible questions', () => {
    expect(blankQuestionOptions(5)).toHaveLength(5);
  });
  it('persists typing in D even when a legacy draft began with three slots', () => {
    expect(setQuestionOption(['A', 'B', 'C'], 3, 'D yanıtı', 4)).toEqual(['A', 'B', 'C', 'D yanıtı']);
  });
  it('persists typing in E without touching previous choices', () => {
    expect(setQuestionOption(['A', 'B', 'C', 'D'], 4, 'E yanıtı', 5)).toEqual(['A', 'B', 'C', 'D', 'E yanıtı']);
  });
  it('refuses out-of-range updates instead of hiding data', () => {
    expect(() => setQuestionOption([], 4, 'x', 4)).toThrow(RangeError);
  });
  it('reduces five choices for a middle-school grade and clears E key', () => {
    expect(personalGradeSelection({ optionCount: 5, correctAnswer: 'E' }, '8. Sınıf'))
      .toEqual({ grade: '8. Sınıf', optionCount: 4, correctAnswer: '' });
  });
  it('preserves 5-choice answers in 10th grade', () => {
    expect(personalGradeSelection({ optionCount: 5, correctAnswer: 'E' }, '10. Sınıf'))
      .toEqual({ grade: '10. Sınıf', optionCount: 5, correctAnswer: 'E' });
  });
  it('does not change a valid A-D key when grade moves down', () => {
    expect(personalGradeSelection({ optionCount: 5, correctAnswer: 'B' }, '7. Sınıf').correctAnswer).toBe('B');
  });
  it('student MCQ preview does not reveal correct option class or solution', () => {
    const html = renderToStaticMarkup(<QuestionTypePreview mode="student" question={{
      content: 'Soru kökü yeterince uzun.', questionType: 'MULTIPLE_CHOICE', optionCount: 4,
      options: ['Alfa', 'Beta', 'Gama', 'Delta'], correctAnswer: 'B', explanation: 'Gizli çözüm metni'
    }} />);
    expect(html).toContain('Beta');
    expect(html).not.toContain('class="correct"');
    expect(html).not.toContain('Gizli çözüm metni');
  });
  it('review MCQ preview retains answer and explanation', () => {
    const html = renderToStaticMarkup(<QuestionTypePreview mode="review" question={{
      content: 'Soru kökü yeterince uzun.', questionType: 'MULTIPLE_CHOICE', optionCount: 4,
      options: ['Alfa', 'Beta', 'Gama', 'Delta'], correctAnswer: 'B', explanation: 'Gizli çözüm metni'
    }} />);
    expect(html).toContain('correct');
    expect(html).toContain('Gizli çözüm metni');
  });
  it('student true/false preview does not reveal its answer', () => {
    const html = renderToStaticMarkup(<QuestionTypePreview mode="student" question={{
      content: 'Deneysel olarak doğru mu?', questionType: 'TRUE_FALSE',
      options: [], correctAnswer: null, booleanAnswer: true, explanation: 'Özel gerekçe'
    }} />);
    expect(html).not.toContain('Cevap anahtarı');
    expect(html).not.toContain('Özel gerekçe');
  });
  it('student open-ended preview hides model, rubric, criteria', () => {
    const html = renderToStaticMarkup(<QuestionTypePreview mode="student" question={{
      content: 'Olayın nedenlerini açıklayınız.', questionType: 'OPEN_ENDED',
      options: [], correctAnswer: null, modelAnswer: 'Gizli model', scoringRubric: 'Gizli rubrik',
      evaluationCriteria: 'Gizli ölçüt', explanation: 'Gizli açıklama'
    }} />);
    for (const secret of ['Gizli model', 'Gizli rubrik', 'Gizli ölçüt', 'Gizli açıklama']) expect(html).not.toContain(secret);
  });
});
