import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StudioMarkup } from '../src/questions/StudioDocumentPreview';
import { geometryMarker } from '../src/questions/geometry-markup';

describe('P3-Q saved geometry student preview', () => {
  it('renders a persisted geometry recipe as an accessible SVG, not raw marker text', () => {
    const markup = renderToStaticMarkup(createElement(StudioMarkup, {
      value: 'ABC: ' + geometryMarker('triangle') + ' alanını bulun.'
    }));
    expect(markup).toContain('<svg');
    expect(markup).toContain('ABC üçgeni');
    expect(markup).toContain('<polygon');
    expect(markup).not.toContain('[[prolig-geometry:');
  });
  it('leaves unrecognized markup inert and escapes HTML', () => {
    const markup = renderToStaticMarkup(createElement(StudioMarkup, {
      value: 'Soru: [[prolig-geometry:v9:circle]] <script>alert(1)</script>'
    }));
    expect(markup).not.toContain('<script>');
    expect(markup).toContain('[[prolig-geometry:v9:circle]]');
    expect(markup).not.toContain('<svg');
  });
});
