import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { PersonalQuestionSummary, summarizePersonalQuestion } from '../src/questions/PersonalQuestionSummary';
import { defaultGeometry, defaultGeometryLabels, editableGeometryMarker } from '../src/questions/geometry-parameters';

describe('RELEASE-07B local library geometry cards', () => {
  it('keeps versioned geometry source out of the visible card but shows SVG thumbnails', () => {
    const labels = defaultGeometryLabels('triangle');
    const marker = editableGeometryMarker({ ...defaultGeometry('triangle'), labels });
    const html = renderToStaticMarkup(createElement(PersonalQuestionSummary, { content: marker + ' ABC için alanı bulunuz.' }));
    expect(html).toContain('<svg');
    expect(html).toContain('Üçgen');
    expect(html).toContain('ABC için alanı bulunuz.');
    expect(html).not.toContain('[[prolig-geometry:');
    expect(html).not.toContain('eyJ');
  });
  it('renders all three supported shapes from old and new marker versions', () => {
    const markers = ['triangle', 'square', 'circle'] as const;
    const text = markers.map(shape => editableGeometryMarker(defaultGeometry(shape))).join(' ');
    const result = summarizePersonalQuestion(text);
    expect(result.drawings).toHaveLength(3);
    expect(result.text).toContain('Üçgen');
    expect(result.text).toContain('Kare');
    expect(result.text).toContain('Çember');
  });
  it('does not print unsupported raw marker payload in a library card', () => {
    const source = 'Metin [[prolig-geometry:v9:triangle:abc]] kalan';
    const result = summarizePersonalQuestion(source);
    expect(result.text).toContain('Desteklenmeyen çizim');
    expect(result.text).not.toContain('[[prolig-geometry:');
  });
  it('shortens question-set excerpts without altering source markers', () => {
    const marker = editableGeometryMarker(defaultGeometry('triangle'));
    expect(summarizePersonalQuestion(marker + ' soru', 36).text).toContain('Üçgen');
    expect(summarizePersonalQuestion(marker + ' soru', 36).text).not.toContain('[[');
  });
});
