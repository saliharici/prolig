import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { legacyQuestionToStudioDocument, parseStudioBlocks, parseStudioInline, safeStudioHref, studioDocumentToLegacy } from '../src/questions/studio-document';
import { StudioDocumentPreview } from '../src/questions/StudioDocumentPreview';
import fs from 'node:fs';
import path from 'node:path';

describe('P1 structured question preview spike', () => {
  it('round-trips Turkish text, CRLF, blank lines, math and exact A-D data', () => {
    const legacy = {
      content: 'İstanbul, Ğüşöç  \r\n\r\n**Önemli** $\\frac{1}{2}$\r\n',
      options: ['A) çiçek', '  B değeri  ', '', 'D) son'],
      explanation: 'Çözüm: Δ = 2',
      correctAnswer: 'B'
    };
    const document = legacyQuestionToStudioDocument(legacy);
    expect(document.schemaVersion).toBe(1);
    expect(studioDocumentToLegacy(document)).toEqual(legacy);
    expect(document.choices).toHaveLength(4);
  });

  it('does not lose unexpected legacy choices during conversion', () => {
    const input = { content: 'Test', options: ['A', 'B', 'C', 'D', 'legacy-extra'], explanation: null, correctAnswer: null };
    const document = legacyQuestionToStudioDocument(input);
    expect(document.choices).toHaveLength(4);
    expect(studioDocumentToLegacy(document).options).toEqual(input.options);
  });

  it('parses emphasis, underlines, math and HTTPS links as typed nodes', () => {
    const nodes = parseStudioInline('**kalın** _eğik_ <u>alt</u> $x^2$ [MEB](https://meb.gov.tr/soru)');
    expect(nodes.map(x => x.kind)).toEqual(['bold', 'text', 'italic', 'text', 'underline', 'text', 'math', 'text', 'link']);
    expect(nodes.at(-1)).toMatchObject({ kind: 'link', href: 'https://meb.gov.tr/soru' });
  });

  it('parses ordered lists and table rows without dropping cells', () => {
    const blocks = parseStudioBlocks('1. İlk\n2. İkinci\n\n| Sınıf | Net |\n| --- | --- |\n| 8 | 12 |');
    expect(blocks[0]).toMatchObject({ kind: 'list', ordered: true });
    expect(blocks[1]).toEqual({ kind: 'table', columns: ['Sınıf', 'Net'], rows: [['8', '12']] });
  });

  it('keeps escaped pipes inside table cells', () => {
    const blocks = parseStudioBlocks('| Ad | Sonuç |\n| --- | --- |\n| A\\|B | 10 |');
    expect(blocks[0]).toMatchObject({ kind: 'table', rows: [['A|B', '10']] });
  });

  it.each(['javascript:alert(1)', 'data:text/html,boom', 'http://example.org', '//example.org', 'https://x:y@example.org', 'https://'])(
    'rejects dangerous or malformed href %s', href => {
      expect(safeStudioHref(href)).toBeNull();
    }
  );

  it('renders user markup as escaped text, not executable HTML', () => {
    const document = legacyQuestionToStudioDocument({
      content: '<img src=x onerror=alert(1)> [bad](javascript:alert(1))',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A'
    });
    const html = renderToStaticMarkup(createElement(StudioDocumentPreview, { document }));
    expect(html).not.toContain('<img');
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('javascript:alert(1)');
  });

  it('renders accessible table, four answers and TeX source fallback', () => {
    const document = legacyQuestionToStudioDocument({
      content: '| A | B |\n| --- | --- |\n| 1 | 2 |\n$x^2 + 1$',
      options: ['Bir', 'İki', 'Üç', 'Dört'],
      correctAnswer: 'C',
      explanation: 'İşlem'
    });
    const html = renderToStaticMarkup(createElement(StudioDocumentPreview, { document }));
    expect(html).toContain('aria-label="Soru tablosu"');
    expect(html).toContain('<table');
    expect(html).toContain('Matematik ifadesi: x^2 + 1');
    expect((html.match(/<li/g) || []).length).toBe(4);
    expect(html).toContain('İşlem');
  });

  it('stays opt-in and never changes existing question API write endpoints', () => {
    const app = fs.readFileSync(path.join(process.cwd(), 'src/DemoApp.tsx'), 'utf8');
    const api = fs.readFileSync(path.join(process.cwd(), 'src/questions/api.ts'), 'utf8');
    expect(app).toContain("import.meta.env.VITE_QUESTION_STUDIO_P1 === 'true'");
    expect(app).toContain('StudioDocumentPreview');
    expect(app).toContain('insertQuestionTable');
    expect(app).toContain("applyQuestionMarkup('
    expect(app).toContain('Tablo için soru gövdesinde yeterli alan yok');
    expect(api).toContain("fetch('/api/v1/questions'");
    expect(api).toContain("fetch(`/api/v1/questions/${id}`");
    expect(api).not.toContain('studioDocument');
  });
});
, '
    expect(app).toContain('Tablo için soru gövdesinde yeterli alan yok');
    expect(api).toContain("fetch('/api/v1/questions'");
    expect(api).toContain("fetch(`/api/v1/questions/${id}`");
    expect(api).not.toContain('studioDocument');
  });
});
, 'formül')");
    expect((app.match(/const insertQuestionTable/g) || [])).toHaveLength(1);
    expect((app.match(/aria-label="Formül ekle"/g) || [])).toHaveLength(1);
    expect((app.match(/aria-label="Tablo ekle"/g) || [])).toHaveLength(1);
    expect(app).not.toContain("applyQuestionMarkup(' aria-label");
    expect(app).toContain('Tablo için soru gövdesinde yeterli alan yok');
    expect(api).toContain("fetch('/api/v1/questions'");
    expect(api).toContain("fetch(`/api/v1/questions/${id}`");
    expect(api).not.toContain('studioDocument');
  });
});
