import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { legacyMarkupToHtml, htmlToLegacyMarkup, sanitizeHtml } from '../src/questions/question-editor-converter';
import { legacyQuestionToStudioDocument, studioDocumentToLegacy, parseStudioInline } from '../src/questions/studio-document';
import { StudioDocumentPreview } from '../src/questions/StudioDocumentPreview';

describe('P2-1 Professional Question Stem WYSIWYG Editor', () => {
  it('correctly isolates P2 editor behind VITE_QUESTION_STUDIO_P2_EDITOR feature flag', () => {
    const app = fs.readFileSync(path.join(process.cwd(), 'src/DemoApp.tsx'), 'utf8');
    expect(app).toContain("import.meta.env.VITE_QUESTION_STUDIO_P2_EDITOR === 'true'");
    expect(app).toContain('QuestionStemWysiwygEditor');
    // Ensure P1 flag and legacy fallback textarea still remain intact
    expect(app).toContain("import.meta.env.VITE_QUESTION_STUDIO_P1 === 'true'");
    expect(app).toContain('textarea ref={questionEditorRef}');
  });

  it('preserves Turkish characters across markup <-> HTML conversions', () => {
    const turkishText = 'İstanbul, Eskişehir, Iğdır, Şanlıurfa, Ağrı ve Çankırı: çığır, öbek, üzüm, şans.';
    const html = legacyMarkupToHtml(turkishText);
    expect(html).toContain('İstanbul');
    expect(html).toContain('Şanlıurfa');
    expect(html).toContain('çığır, öbek, üzüm, şans');

    const markdown = htmlToLegacyMarkup(html);
    expect(markdown).toBe(turkishText);
  });

  it('converts bold, italic, underline and lists between formats cleanly', () => {
    const raw = '**Önemli Not:**\n_Lütfen dikkat ediniz._\n<u>Altı çizili alan</u>\n- Madde 1\n- Madde 2';
    const html = legacyMarkupToHtml(raw);
    expect(html).toContain('<strong>Önemli Not:</strong>');
    expect(html).toContain('<em>Lütfen dikkat ediniz.</em>');
    expect(html).toContain('<u>Altı çizili alan</u>');
    expect(html).toContain('<ul><li>Madde 1</li><li>Madde 2</li></ul>');

    const roundtrip = htmlToLegacyMarkup(html);
    expect(roundtrip).toContain('**Önemli Not:**');
    expect(roundtrip).toContain('_Lütfen dikkat ediniz._');
    expect(roundtrip).toContain('<u>Altı çizili alan</u>');
    expect(roundtrip).toContain('- Madde 1');
    expect(roundtrip).toContain('- Madde 2');
  });

  it('prevents XSS attacks and dangerous javascript schemes', () => {
    const malicious = '<script>alert(1)</script><img src="x" onerror="alert(2)" /> [Tehlike](javascript:alert(3))';
    const sanitized = sanitizeHtml(malicious);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('onerror=');

    const html = legacyMarkupToHtml(malicious);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('href="javascript:alert(3)"');
  });

  it('keeps valid HTTPS links in formatted content', () => {
    const linkText = 'Bilgi için [MEB Resmi Sayfası](https://www.meb.gov.tr/duyurular) inceleyiniz.';
    const html = legacyMarkupToHtml(linkText);
    expect(html).toContain('href="https://www.meb.gov.tr/duyurular"');
    expect(html).toContain('MEB Resmi Sayfası');

    const markdown = htmlToLegacyMarkup(html);
    expect(markdown).toContain('[MEB Resmi Sayfası](https://www.meb.gov.tr/duyurular)');
  });

  it('handles empty and whitespace-only text safely', () => {
    expect(legacyMarkupToHtml('')).toBe('<p></p>');
    expect(htmlToLegacyMarkup('')).toBe('');
    expect(htmlToLegacyMarkup('<p></p>')).toBe('');
  });

  it('renders underline and nested formats as real React elements in StudioDocumentPreview without leaking raw tags', () => {
    const sample = '<u>Altı çizili soru yönergesi</u> ve **<u>kalın altı çizili vurgu</u>**';
    const doc = legacyQuestionToStudioDocument({
      content: sample,
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A'
    });
    const markup = renderToStaticMarkup(createElement(StudioDocumentPreview, { document: doc }));
    expect(markup).toContain('<u><span>Altı çizili soru yönergesi</span></u>');
    expect(markup).toContain('<strong><u><span>kalın altı çizili vurgu</span></u></strong>');
    expect(markup).not.toContain('&lt;u&gt;');
  });

  it('idempotently reopens and serializes legacy questions without markup accumulation', () => {
    const original = '**Soru Kökü:** <u>Lütfen</u> aşağıdaki _üçgen_ alanını bulunuz.\n- Taban: 6 cm\n- Yükseklik: 4 cm';
    let current = original;
    for (let round = 0; round < 3; round++) {
      const html = legacyMarkupToHtml(current);
      current = htmlToLegacyMarkup(html);
    }
    expect(current).toContain('**Soru Kökü:**');
    expect(current).toContain('<u>Lütfen</u>');
    expect(current).toContain('_üçgen_');
    expect(current).toContain('- Taban: 6 cm');
    expect(current).toContain('- Yükseklik: 4 cm');
    expect(current).not.toContain('<u><u>');
    expect(current).not.toContain('****');
  });
  it('round-trips an isolated italic mark into the actual question preview', () => {
    const raw = 'Türkçe _italik_ metin ve düz yazı';
    const reloaded = htmlToLegacyMarkup(legacyMarkupToHtml(raw));
    expect(reloaded).toBe(raw);
    const doc = legacyQuestionToStudioDocument({
      content: reloaded,
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A'
    });
    const markup = renderToStaticMarkup(createElement(StudioDocumentPreview, { document: doc }));
    expect(markup).toContain('<em><span>italik</span></em>');
  });

  it('keeps toolbar selection and does not use timer-based editor-to-React sync', () => {
    const code = fs.readFileSync(path.join(process.cwd(), 'src/questions/QuestionStemWysiwygEditor.tsx'), 'utf8');
    const css = fs.readFileSync(path.join(process.cwd(), 'src/questions/question-editor-p2.css'), 'utf8');
    expect(code).toContain("toggleItalic().run()");
    expect(code).toContain("event.preventDefault()");
    expect(code).toContain('lastEmittedValueRef');
    expect(code).not.toContain('isInternalUpdateRef');
    expect(css).toMatch(/\.question-p2-editor\s+\.question-p2-content-area\s+\.tiptap\s+em/);
    expect(css).toContain('font-style: italic !important');
  });

  it('offers opt-in polling or no-watch modes without impacting normal Vite startup', () => {
    const config = fs.readFileSync(path.join(process.cwd(), 'vite.config.ts'), 'utf8');
    expect(config).toContain('PROLIG_VITE_WATCH_MODE');
    expect(config).toContain("mode === 'polling'");
    expect(config).toContain("mode === 'off'");
    expect(config).toContain('watch: disableWatch');
  });

});

describe('P2-2 Professional Answer + Solution Editor wiring', () => {
  it('keeps A-D choices and solution rich only under the P2 feature flag', () => {
    const app = fs.readFileSync(path.join(process.cwd(), 'src/DemoApp.tsx'), 'utf8');
    expect(app).toContain('variant="option"');
    expect(app).toContain('variant="explanation"');
    expect(app).toContain('maxLength={500}');
    expect(app).toContain('maxLength={600}');
    expect(app).toContain('questionCorrectAnswer === letter');
    expect(app).toContain('questionSaving || durableDraftBusy');
    expect(app).toContain('input type="text" value={option}'); // P1 fallback unchanged
    expect(app).toContain('className="question-explanation" maxLength={600}'); // P1 fallback unchanged
    expect(app).toContain("import.meta.env.VITE_QUESTION_STUDIO_P2_EDITOR === 'true'");
  });

  it('preserves separate stem, option and explanation legacy strings', () => {
    const stem = 'Soru _italik_ metni';
    const options = ['**20**', '_18_', '<u>22</u>', '24'];
    const explanation = 'Önce _toplayın_:\n- 12\n- 8';
    for (const text of [stem, ...options, explanation]) {
      const result = htmlToLegacyMarkup(legacyMarkupToHtml(text));
      expect(result).toContain(text.includes('Önce') ? 'Önce _toplayın_' : text.split('\n')[0]);
    }
    const doc = legacyQuestionToStudioDocument({ content: stem, options, correctAnswer: 'A', explanation });
    const html = renderToStaticMarkup(createElement(StudioDocumentPreview, { document: doc }));
    expect(html).toContain('italik');
    expect(html).toContain('20');
    expect(html).toContain('toplayın');
  });
});

describe('P2-2C Rich Text Round-Trip Acceptance', () => {
  // Scenario 1: Kalın, italik ve altı çizili metin
  it('Scenario 1: converts and previews bold, italic and underline marks without leaking raw tags', () => {
    const raw = 'Bir **kalın**, bir _italik_ ve bir <u>altı çizili</u> ifade.';
    const html = legacyMarkupToHtml(raw);
    expect(html).toContain('<strong>kalın</strong>');
    expect(html).toContain('<em>italik</em>');
    expect(html).toContain('<u>altı çizili</u>');

    const roundtrip = htmlToLegacyMarkup(html);
    expect(roundtrip).toBe(raw);

    const doc = legacyQuestionToStudioDocument({
      content: roundtrip,
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A'
    });
    const rendered = renderToStaticMarkup(createElement(StudioDocumentPreview, { document: doc }));
    expect(rendered).toContain('<strong><span>kalın</span></strong>');
    expect(rendered).toContain('<em><span>italik</span></em>');
    expect(rendered).toContain('<u><span>altı çizili</span></u>');
    expect(rendered).not.toContain('&lt;u&gt;');
  });

  // Scenario 2: Soru kökü, A–D seçenekleri ve çözüm alanlarının birbirinden bağımsız korunması
  it('Scenario 2: preserves question stem, options A-D and explanation independently without bleed-through', () => {
    const question = {
      content: '**Soru Yönergesi:** Aşağıdaki adımları uygulayın:\n\n- Madde bir\n- Madde iki',
      options: [
        'A) _İtalik seçenek_',
        'B) **Kalın seçenek**',
        'C) <u>Altı çizili seçenek</u>',
        'D) Normal düz metin seçenek'
      ],
      correctAnswer: 'B',
      explanation: 'Çözüm adımları:\n\n1. Adım bir\n2. Adım iki\n\nFormül: $x = \\sqrt{16} = 4$'
    };

    // Verify each field transforms independently
    const stemHtml = legacyMarkupToHtml(question.content);
    const optionsHtml = question.options.map(opt => legacyMarkupToHtml(opt));
    const explanationHtml = legacyMarkupToHtml(question.explanation);

    expect(stemHtml).toContain('<strong>Soru Yönergesi:</strong>');
    expect(stemHtml).toContain('<ul><li>Madde bir</li><li>Madde iki</li></ul>');
    expect(optionsHtml[0]).toContain('<em>İtalik seçenek</em>');
    expect(optionsHtml[1]).toContain('<strong>Kalın seçenek</strong>');
    expect(optionsHtml[2]).toContain('<u>Altı çizili seçenek</u>');
    expect(optionsHtml[3]).toContain('Normal düz metin seçenek');
    expect(explanationHtml).toContain('<ol><li>Adım bir</li><li>Adım iki</li></ol>');
    expect(explanationHtml).toContain('<code>$x = \\sqrt{16} = 4$</code>');

    // Round-trip back to legacy strings
    const roundtripStem = htmlToLegacyMarkup(stemHtml);
    const roundtripOptions = optionsHtml.map(h => htmlToLegacyMarkup(h));
    const roundtripExplanation = htmlToLegacyMarkup(explanationHtml);

    expect(roundtripStem).toBe(question.content);
    expect(roundtripOptions).toEqual(question.options);
    expect(roundtripExplanation).toBe(question.explanation);

    // Verify document model and preview
    const doc = legacyQuestionToStudioDocument({
      content: roundtripStem,
      options: roundtripOptions,
      correctAnswer: question.correctAnswer,
      explanation: roundtripExplanation
    });
    expect(doc.choices).toHaveLength(4);
    expect(doc.legacy.correctAnswer).toBe('B');

    const restored = studioDocumentToLegacy(doc);
    expect(restored.content).toBe(question.content);
    expect(restored.options).toEqual(question.options);
    expect(restored.explanation).toBe(question.explanation);
    expect(restored.correctAnswer).toBe('B');

    const preview = renderToStaticMarkup(createElement(StudioDocumentPreview, { document: doc }));
    expect(preview).toContain('correct');
    expect(preview).toContain('studio-math-source');
  });

  // Scenario 3: Türkçe karakterler, boş satırlar ve paragraf sonları
  it('Scenario 3: strictly preserves all Turkish characters, blank lines and paragraph breaks', () => {
    const turkishParagraphs = [
      'İstanbul, Eskişehir, Iğdır, Şanlıurfa, Ağrı ve Çankırı illerinde yapılan çalışmada;',
      'çığır açan yeni yöntemler, öbek analizi, üzüm bağları ve şans faktörü değerlendirilmiştir.',
      'Ayrıca şairin kâğıt, rüzgâr ve sükût üzerine yazdığı şiirler incelenmiştir.'
    ].join('\n\n');

    const html = legacyMarkupToHtml(turkishParagraphs);
    expect(html).toContain('İstanbul');
    expect(html).toContain('Eskişehir');
    expect(html).toContain('Iğdır');
    expect(html).toContain('Şanlıurfa');
    expect(html).toContain('Ağrı');
    expect(html).toContain('Çankırı');
    expect(html).toContain('kâğıt');
    expect(html).toContain('rüzgâr');
    expect(html).toContain('sükût');

    const roundtrip = htmlToLegacyMarkup(html);
    expect(roundtrip).toBe(turkishParagraphs);
  });

  // Scenario 4: Aynı metinde birden fazla biçimlendirme
  it('Scenario 4: handles nested and multi-formatting on identical substrings without corrupting tokens', () => {
    const multiFormatted = '**_Kalın ve İtalik_** ile **<u>Kalın ve Altı Çizili</u>** ve _<u>İtalik ve Altı Çizili</u>_ metin.';
    const html = legacyMarkupToHtml(multiFormatted);
    expect(html).toContain('<strong><em>Kalın ve İtalik</em></strong>');
    expect(html).toContain('<strong><u>Kalın ve Altı Çizili</u></strong>');
    expect(html).toContain('<em><u>İtalik ve Altı Çizili</u></em>');

    const roundtrip = htmlToLegacyMarkup(html);
    expect(roundtrip).toBe(multiFormatted);

    const doc = legacyQuestionToStudioDocument({
      content: roundtrip,
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A'
    });
    const preview = renderToStaticMarkup(createElement(StudioDocumentPreview, { document: doc }));
    expect(preview).toContain('<strong><em><span>Kalın ve İtalik</span></em></strong>');
    expect(preview).toContain('<strong><u><span>Kalın ve Altı Çizili</span></u></strong>');
    expect(preview).not.toContain('&lt;u&gt;');
  });

  // Scenario 5: Matematiksel ifadeler ve özel karakterler
  it('Scenario 5: preserves math formulas and special characters without XSS vulnerability', () => {
    const mathContent = 'Pisagor: $a^2 + b^2 = c^2$, rasyonel: $\\frac{x}{y}$, oran: %25 & <küçük> > <büyük> @test #soru.';
    const html = legacyMarkupToHtml(mathContent);
    expect(html).toContain('<code>$a^2 + b^2 = c^2$</code>');
    expect(html).toContain('<code>$\\frac{x}{y}$</code>');
    expect(html).toContain('&amp;');
    expect(html).toContain('&lt;küçük&gt;');
    expect(html).toContain('&gt;');

    const roundtrip = htmlToLegacyMarkup(html);
    expect(roundtrip).toBe(mathContent);

    const doc = legacyQuestionToStudioDocument({
      content: roundtrip,
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A'
    });
    const preview = renderToStaticMarkup(createElement(StudioDocumentPreview, { document: doc }));
    expect(preview).toContain('studio-math-source');
    expect(preview).toContain('aria-label="Matematik ifadesi: a^2 + b^2 = c^2"');
    expect(preview).toContain('&lt;küçük&gt;');
  });

  // Scenario 6: Bağlantı güvenliği ve güvenli önizleme
  it('Scenario 6: enforces strict link security, permitting only HTTPS and neutralising unsafe schemes', () => {
    const validLink = '[Resmi Kaynak](https://meb.gov.tr/mevzuat)';
    const httpLink = '[Güvensiz HTTP](http://insecure.example.com)';
    const xssLink = '[Zararlı JS](javascript:alert(document.cookie))';
    const credLink = '[Kimlik Bilgisi](https://admin:pass@evil.com/hack)';
    const scriptTag = '<script>window.__pwned = true;</script>';

    const fullText = `${validLink}\n${httpLink}\n${xssLink}\n${credLink}\n${scriptTag}`;
    const html = legacyMarkupToHtml(fullText);

    // Only valid HTTPS should be converted to an anchor tag
    expect(html).toContain('<a href="https://meb.gov.tr/mevzuat" target="_blank" rel="noopener noreferrer">Resmi Kaynak</a>');
    expect(html).not.toContain('href="http://');
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain('href="https://admin:pass@evil.com/hack"');
    expect(html).not.toContain('<script>');

    const doc = legacyQuestionToStudioDocument({
      content: fullText,
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A'
    });
    const preview = renderToStaticMarkup(createElement(StudioDocumentPreview, { document: doc }));
    expect(preview).toContain('href="https://meb.gov.tr/mevzuat"');
    expect(preview).not.toContain('<script');
    expect(preview).not.toContain('href="javascript:');
  });

  // Scenario 7: Eski soruların değiştirilmeden okunabilmesi
  it('Scenario 7: reads legacy question fixtures and formats without mutating or dropping legacy data', () => {
    const legacyFixture = {
      content: 'İstanbul, iş  \r\n\r\n**Önemli** $\\frac{1}{2}$\r\n',
      options: ['A) Çiçek', '  B değeri  ', '', 'D) son'],
      explanation: 'Çözüm: ? = 2',
      correctAnswer: 'B'
    };

    const doc = legacyQuestionToStudioDocument(legacyFixture);
    expect(doc.schemaVersion).toBe(1);
    expect(doc.sourceFormat).toBe('legacy-markup-v1');
    expect(doc.legacy.content).toBe(legacyFixture.content);
    expect(doc.legacy.options).toEqual(legacyFixture.options);
    expect(doc.legacy.explanation).toBe(legacyFixture.explanation);
    expect(doc.legacy.correctAnswer).toBe(legacyFixture.correctAnswer);

    const exported = studioDocumentToLegacy(doc);
    expect(exported).toEqual(legacyFixture);
  });

  // Scenario 8: Düzenleme -> dönüştürme -> yeniden açma döngüsünde içerik ve biçimlendirme eşitliği (idempotency)
  it('Scenario 8: guarantees round-trip equality across multiple cycles without token drift or tag bloat', () => {
    const original = [
      '**Başlık:** Bu bir _deneme_ sorusudur.',
      '<u>Altı çizili yönerge</u>:',
      '1. İlk adımı tamamlayın: $E = mc^2$\n2. İkinci adımı kontrol edin: [MEB](https://meb.gov.tr/)',
      '- Önemli not: **_ikili biçim_** ve **<u>altı çizili kalın</u>**'
    ].join('\n\n');

    let current = original;
    for (let cycle = 1; cycle <= 4; cycle++) {
      const html = legacyMarkupToHtml(current);
      current = htmlToLegacyMarkup(html);
    }

    expect(current).toBe(original);
    expect(current).not.toContain('****');
    expect(current).not.toContain('<u><u>');
    expect(current).not.toContain('____');
  });
});
