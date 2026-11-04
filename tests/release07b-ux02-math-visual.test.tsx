import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { InlineMath } from '../src/questions/InlineMath';
import { legacyMarkupToHtml, htmlToLegacyMarkup } from '../src/questions/question-editor-converter';
import { StudioMarkup } from '../src/questions/StudioDocumentPreview';

const cases = [
  '$\\frac{3}{4}$ + $\\frac{1}{2}$',
  '$2^{3}$ + $3^{2}$',
  '$\\sqrt{144}$',
  '$x_{1}$',
];

describe('RELEASE-07B UX-02 local math visualization', () => {
  it('shows existing formulas as visible fractions and powers in all question previews', () => {
    const html = renderToStaticMarkup(<StudioMarkup value={cases.slice(0, 2).join(' ')} />);
    expect(html).toContain('prolig-math-fraction');
    expect(html).toContain('<sup>');
    expect(html).not.toContain('$\\frac');
  });
  it('renders root and subscript without raw source in preview', () => {
    const html = renderToStaticMarkup(<StudioMarkup value={cases.slice(2).join(' ')} />);
    expect(html).toContain('prolig-math-radicand');
    expect(html).toContain('<sub>');
  });
  it('imports stored formulas as selectable math atoms (not code)', () => {
    const html = legacyMarkupToHtml(cases.join(' '));
    expect(html).toContain('data-prolig-math=');
    expect(html).not.toContain('<code>');
  });
  it('preserves formula source in fallback conversion roundtrip', () => {
    expect(htmlToLegacyMarkup(legacyMarkupToHtml(cases.join(' ')))).toBe(cases.join(' '));
  });
  it('preserves formulas in the A-E option view', () => {
    const html = renderToStaticMarkup(<StudioMarkup value={'$\\frac{5}{6}$'} />);
    expect(html).toContain('prolig-math-fraction');
  });
  it('does not hide unsupported source or inject markup', () => {
    const html = renderToStaticMarkup(<InlineMath source={'<script>alert(1)</script>'} />);
    expect(html).toContain('prolig-math-unsupported');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });
});
