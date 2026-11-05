import { describe, expect, it } from 'vitest';
import { applyAiReviewEdit, parseAiReviewReport } from '../shared/ai-editor-contract';

describe('RELEASE-08 advisory AI contract', () => {
  it('validates structured issues and rejects untrusted categories', () => {
    const data = parseAiReviewReport({
      summary: 'İnsan editör kontrol etmeli.',
      issues: [{ category: 'language', severity: 'minor',
        expert: 'editorial_assistant', explanation: 'Anlatım bozukluğu.',
        suggestion: 'Cümleyi sadeleştir.',
        edit: { field: 'content', before: 'çok kolay bir soru', after: 'basit bir soru' } }]
    });
    expect(data.issues).toHaveLength(1);
    expect(data.issues[0].edit?.before).toBe('çok kolay bir soru');
    expect(() => parseAiReviewReport({ summary: 'X', issues: [{ category: 'user_admin' }] })).toThrow();
  });
  it('only changes unique prose without touching editable math/geometry', () => {
    const source = 'Aşağıdaki soruyu yanıtlayınız. $x^2+1$ [geometry:triangle]';
    expect(applyAiReviewEdit(source, {
      field: 'content', before: 'soruyu yanıtlayınız', after: 'soruyu çözünüz'
    })).toContain('$x^2+1$ [geometry:triangle]');
    expect(applyAiReviewEdit(source, {
      field: 'content', before: '$x^2+1$', after: '$x^3+1$'
    })).toBeNull();
    expect(applyAiReviewEdit('tekrar tekrar', {
      field: 'content', before: 'tekrar', after: 'yeniden'
    })).toBeNull();
    expect(applyAiReviewEdit(source, {
      field: 'content', before: 'geometry', after: 'geometri'
    })).toBeNull();
  });
  it('drops unsafe replacement proposals instead of modifying question structure', () => {
    const output = parseAiReviewReport({
      summary: 'İnceleme.',
      issues: [{ category: 'mathematics', severity: 'major', expert: 'question_reviewer',
        explanation: 'Kontrol gerekli.', suggestion: 'Matematiksel ifadeyi gözden geçirin.',
        edit: { field: 'content', before: '$x^2$', after: '$x^3$' } }]
    });
    expect(output.issues[0].edit).toBeUndefined();
  });
});
