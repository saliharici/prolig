import { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  List as ListIcon,
  ListOrdered as ListOrderedIcon,
  Link as LinkIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Unlink as UnlinkIcon,
  Sparkles
} from 'lucide-react';
import { legacyMarkupToHtml, htmlToLegacyMarkup } from './question-editor-converter';
import { safeStudioHref } from './studio-document';
import './question-editor-p2.css';

interface QuestionStemWysiwygEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  maxLength?: number;
  placeholder?: string;
  disabled?: boolean;
  /** Keep the existing API storage format; only adjust editor controls and sizing. */
  variant?: 'stem' | 'option' | 'explanation';
  ariaLabel?: string;
}

export function QuestionStemWysiwygEditor({
  value,
  onChange,
  maxLength = 1200,
  placeholder = 'Sorunun yönergesini ve içeriğini yazın...',
  disabled = false,
  variant = 'stem',
  ariaLabel
}: QuestionStemWysiwygEditorProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [symbolPalette, setSymbolPalette] = useState<'math' | 'science' | null>(null);
  const [equationTemplatesOpen, setEquationTemplatesOpen] = useState(false);
  const [equationSource, setEquationSource] = useState('');
  const [tableOpen, setTableOpen] = useState(false);
  const [shapeOpen, setShapeOpen] = useState(false);
  const [shapeType, setShapeType] = useState<'triangle' | 'circle' | 'square'>('triangle');
  const [tableRows, setTableRows] = useState<string[][]>([['Başlık 1', 'Başlık 2'], ['', '']]);
  const [equationEditRange, setEquationEditRange] = useState<{ from: number; to: number } | null>(null);
  const [fractionNumerator, setFractionNumerator] = useState('a');
  const [fractionDenominator, setFractionDenominator] = useState('b');
  const [mathBase, setMathBase] = useState('x');
  const [mathArgument, setMathArgument] = useState('2');
  const [mathBuilderType, setMathBuilderType] = useState<'root' | 'power' | 'subscript'>('root');
  const [linkUrl, setLinkUrl] = useState('');
  // A Tiptap edit must not be re-imported as external content on the next React render.
  // A timer-based guard races with React scheduling and can drop active marks/caret.
  const lastEmittedValueRef = useRef<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        // Tiptap v3 StarterKit already bundles these extensions. Use the
        // separately configured variants below once, without duplicate names.
        link: false,
        underline: false
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      })
    ],
    content: legacyMarkupToHtml(value),
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        'aria-label': ariaLabel || (variant === 'option' ? 'Cevap seçeneği zengin metin editörü' : variant === 'explanation' ? 'Çözüm zengin metin editörü' : 'Soru gövdesi zengin metin editörü'),
        'role': 'textbox',
        'aria-multiline': 'true'
      }
    },
    onUpdate: ({ editor: ed }) => {
      const markdown = htmlToLegacyMarkup(ed.getHTML());
      lastEmittedValueRef.current = markdown;
      onChange(markdown);
    }
  });

  // Keep external changes in sync if updated from outside (e.g. draft restore, undo)
  useEffect(() => {
    if (!editor) return;
    // Parent echo of our own change: leave Tiptap selection and active marks alone.
    if (value === lastEmittedValueRef.current) {
      lastEmittedValueRef.current = null;
      return;
    }
    lastEmittedValueRef.current = null;

    const currentMarkdown = htmlToLegacyMarkup(editor.getHTML());
    if (currentMarkdown !== value) {
      // External change (e.g. encrypted draft recovery). Do not emit a second edit.
      editor.commands.setContent(legacyMarkupToHtml(value), { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) {
    return null;
  }

  const handleSetLink = () => {
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetLink().run();
      setShowLinkInput(false);
      return;
    }

    const input = linkUrl.trim();
    // Reject explicitly non-HTTPS schemes. Do not turn an HTTP link into
    // some unrelated HTTPS address by prepending a protocol.
    if (/^[a-z][a-z0-9+.-]*:/i.test(input) && !/^https:\/\//i.test(input)) return;
    const candidate = /^https:\/\//i.test(input) ? input : `https://${input}`;
    const url = safeStudioHref(candidate);
    if (!url) {
      // An unsupported URL must never silently become a different saved link.
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    setLinkUrl('');
    setShowLinkInput(false);
  };

  const handleOpenLinkInput = () => {
    const previousUrl = editor.getAttributes('link').href || '';
    setLinkUrl(previousUrl);
    setShowLinkInput(true);
  };

  const currentLength = value.length;
  const isOverLimit = currentLength > maxLength;

  return (
    <div className={`question-p2-editor question-p2-editor--${variant}`} aria-label={ariaLabel || 'Profesyonel Soru Editörü'}>
      {variant === 'stem' && <div className="question-p2-badge">
        <Sparkles size={14} />
        <span>Profesyonel Soru Editörü</span>
      </div>}

      <div className="question-p2-toolbar" role="toolbar" aria-label="Zengin metin araçları"
        onMouseDown={event => {
          // Preserve ProseMirror selection when a mouse click hits a toolbar button.
          if ((event.target as HTMLElement).closest('button')) event.preventDefault();
        }}>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled || !editor.can().chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
          title="Kalın (Ctrl+B)"
          aria-label="Kalın"
        >
          <BoldIcon size={16} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled || !editor.can().chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
          aria-pressed={editor.isActive('italic')}
          title="İtalik (Ctrl+I)"
          aria-label="İtalik"
        >
          <ItalicIcon size={16} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={disabled || !editor.can().chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'is-active' : ''}
          title="Altı Çizili (Ctrl+U)"
          aria-label="Altı Çizili"
        >
          <UnderlineIcon size={16} />
        </button>

        <span className="question-p2-divider" aria-hidden="true" />

        {variant !== 'option' && <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled}
          className={editor.isActive('bulletList') ? 'is-active' : ''}
          title="Madde İşaretli Liste"
          aria-label="Madde İşaretli Liste"
        >
          <ListIcon size={16} />
        </button>}

        {variant !== 'option' && <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled}
          className={editor.isActive('orderedList') ? 'is-active' : ''}
          title="Numaralı Liste"
          aria-label="Numaralı Liste"
        >
          <ListOrderedIcon size={16} />
        </button>}

        <span className="question-p2-divider" aria-hidden="true" />

        <button
          type="button"
          onClick={handleOpenLinkInput}
          disabled={disabled}
          className={editor.isActive('link') ? 'is-active' : ''}
          title="Bağlantı Ekle / Düzenle"
          aria-label="Bağlantı Ekle"
        >
          <LinkIcon size={16} />
        </button>

        {editor.isActive('link') && (
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetLink().run()}
            disabled={disabled}
            title="Bağlantıyı Kaldır"
            aria-label="Bağlantıyı Kaldır"
          >
            <UnlinkIcon size={16} />
          </button>
        )}

        <span className="question-p2-divider" aria-hidden="true" />

        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={disabled || !editor.can().chain().focus().undo().run()}
          title="Geri Al (Ctrl+Z)"
          aria-label="Geri Al"
        >
          <UndoIcon size={16} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={disabled || !editor.can().chain().focus().redo().run()}
          title="İleri Al (Ctrl+Y)"
          aria-label="İleri Al"
        >
          <RedoIcon size={16} />
        </button>
      </div>

      {variant !== 'option' && (
        <div className="question-p2-symbol-controls" aria-label="Soru sembolleri">
          <button type="button" aria-expanded={symbolPalette === 'math'} disabled={disabled} onClick={() => setSymbolPalette(x => x === 'math' ? null : 'math')}>∑ Matematik</button>
          <button type="button" aria-expanded={symbolPalette === 'science'} disabled={disabled} onClick={() => setSymbolPalette(x => x === 'science' ? null : 'science')}>⚗ Fen sembolleri</button>
        </div>
      )}
      {symbolPalette && variant !== 'option' && (
        <div className="question-p2-symbol-palette" role="group" aria-label={symbolPalette === 'math' ? 'Matematik sembolleri' : 'Fen sembolleri'}>
          {(symbolPalette === 'math'
            ? ['π', '√', '∑', '∞', '≤', '≥', '≠', '±', '×', '÷', '²', '³', '₁', '₂', 'α', 'β', 'θ', 'Δ']
            : ['°', '℃', 'Ω', 'μ', 'λ', 'ν', '→', '⇌', '↑', '↓', '₀', '₁', '₂', '₃', '²', '³', 'Δ', '·']
          ).map(symbol => <button key={symbol} type="button" disabled={disabled} aria-label={symbol + ' ekle'}
            onMouseDown={event => event.preventDefault()}
            onClick={() => editor.chain().focus().insertContent(symbol).run()}>{symbol}</button>)}
          <span className="question-p2-symbol-note">Semboller metin olarak eklenir; denklem nesnesi değildir.</span>
        </div>
      )}
      {variant !== 'option' && <div className="question-p3-equation-controls">
        <button type="button" disabled={disabled} aria-expanded={equationTemplatesOpen} onClick={() => setEquationTemplatesOpen(open => !open)}>ƒ(x) Denklem şablonları</button>
        {equationTemplatesOpen && <div className="question-p3-equation-templates" role="group" aria-label="Denklem şablonları">
          {([['Kesir', '\\frac{a}{b}'], ['Karekök', '\\sqrt{x}'], ['Üs', 'x^{2}'], ['Alt indis', 'x_{1}']] as const).map(([label, template]) =>
            <button type="button" key={label} disabled={disabled} title={template}
              onMouseDown={event => event.preventDefault()}
              onClick={() => editor.chain().focus().insertContent('$' + template + '$').run()}>{label}</button>)}
          <div className="question-p3-fraction-builder" aria-label="Görsel kesir oluşturucu">
            <strong>Kesir oluştur</strong>
            <div className="question-p3-fraction-layout">
              <div className="question-p3-fraction-fields">
                <label htmlFor="p3-fraction-numerator">Pay</label>
                <input id="p3-fraction-numerator" value={fractionNumerator} maxLength={30} disabled={disabled}
                  onChange={event => setFractionNumerator(event.target.value)} />
                <label htmlFor="p3-fraction-denominator">Payda</label>
                <input id="p3-fraction-denominator" value={fractionDenominator} maxLength={30} disabled={disabled}
                  onChange={event => setFractionDenominator(event.target.value)} />
              </div>
              <div className="question-p3-fraction-live" aria-label="Kesir görünümü">
                <span>{fractionNumerator || '□'}</span><span>{fractionDenominator || '□'}</span>
              </div>
            </div>
            <button type="button"
              disabled={disabled || !fractionNumerator.trim() || !fractionDenominator.trim() || !/^[a-zA-Z0-9+*/(). -]+$/.test(fractionNumerator) || !/^[a-zA-Z0-9+*/(). -]+$/.test(fractionDenominator)}
              onMouseDown={event => event.preventDefault()}
              onClick={() => editor.chain().focus().insertContent('$\\frac{' + fractionNumerator.trim() + '}{' + fractionDenominator.trim() + '}$').run()}>
              Kesri soru metnine ekle
            </button>
            <small>Görünüm, oluşturma önizlemesidir. Soru metninde LaTeX olarak saklanır; Word çıktısı ayrıca kontrol edilmelidir.</small>
          </div>
          <div className="question-p3-math-builder" aria-label="Kök üs ve alt indis oluşturucu">
            <strong>Matematiksel ifade oluştur</strong>
            <div className="question-p3-math-builder-types" role="group" aria-label="İfade türü">
              {([['root', 'Karekök'], ['power', 'Üs'], ['subscript', 'Alt indis']] as const).map(([kind, label]) =>
                <button type="button" key={kind} disabled={disabled} aria-pressed={mathBuilderType === kind}
                  onClick={() => setMathBuilderType(kind)}>{label}</button>)}
            </div>
            <div className="question-p3-math-builder-fields">
              {mathBuilderType !== 'root' && <label htmlFor="p3-math-base">Taban
                <input id="p3-math-base" value={mathBase} maxLength={30} disabled={disabled} onChange={event => setMathBase(event.target.value)} />
              </label>}
              <label htmlFor="p3-math-argument">{mathBuilderType === 'root' ? 'Kök içi' : mathBuilderType === 'power' ? 'Üs değeri' : 'Alt indis'}
                <input id="p3-math-argument" value={mathArgument} maxLength={30} disabled={disabled} onChange={event => setMathArgument(event.target.value)} />
              </label>
            </div>
            <div className="question-p3-math-builder-preview" aria-label="Matematiksel ifade önizlemesi">
              {mathBuilderType === 'root' ? <span>√<span className="question-p3-radicand">{mathArgument || '□'}</span></span>
                : mathBuilderType === 'power' ? <span>{mathBase || '□'}<sup>{mathArgument || '□'}</sup></span>
                : <span>{mathBase || '□'}<sub>{mathArgument || '□'}</sub></span>}
            </div>
            <button type="button" disabled={disabled || !mathArgument.trim() || (mathBuilderType !== 'root' && !mathBase.trim()) ||
              !/^[a-zA-Z0-9+*/(). -]+$/.test(mathArgument) || (mathBuilderType !== 'root' && !/^[a-zA-Z0-9+*/(). -]+$/.test(mathBase))}
              onMouseDown={event => event.preventDefault()}
              onClick={() => {
                const value = mathBuilderType === 'root' ? '\\sqrt{' + mathArgument.trim() + '}' :
                  mathBase.trim() + (mathBuilderType === 'power' ? '^{' : '_{') + mathArgument.trim() + '}';
                editor.chain().focus().insertContent('$' + value + '$').run();
              }}>İfadeyi soru metnine ekle</button>
            <small>Görsel oluşturma önizlemesi. Kayıt LaTeX metnidir; tam görsel denklem nesnesi değildir.</small>
          </div>
          <button type="button" disabled={disabled} onMouseDown={event => event.preventDefault()}
            onClick={() => {
              const { from, to } = editor.state.selection;
              const selected = editor.state.doc.textBetween(from, to, '');
              if (selected.length >= 3 && selected.startsWith('$') && selected.endsWith('$') && !selected.slice(1, -1).includes('$')) {
                setEquationSource(selected.slice(1, -1));
                setEquationEditRange({ from, to });
              } else {
                setEquationEditRange(null);
              }
            }}>Seçili LaTeX ifadesini düzenle</button>
          {equationEditRange && <small role="status">Seçili ifade yüklendi. Yeni metin, aynı konumda değiştirilecek.</small>}
          <label className="question-p3-equation-compose-label" htmlFor="p3-equation-source">Denklem kaynağı (LaTeX)</label>
          <input id="p3-equation-source" className="question-p3-equation-compose-input" type="text" value={equationSource}
            disabled={disabled} maxLength={150} placeholder="\\frac{a}{b}"
            onChange={event => setEquationSource(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }} />
          <button type="button" disabled={disabled || !equationSource.trim() || equationSource.includes('$') || /[<>]/.test(equationSource)}
            onMouseDown={event => event.preventDefault()}
            onClick={() => { const markup = '$' + equationSource.trim() + '$'; if (equationEditRange) { editor.chain().focus().insertContentAt(equationEditRange, markup).run(); setEquationEditRange(null); } else { editor.chain().focus().insertContent(markup).run(); } setEquationSource(''); }}>
            Denklemi metne ekle
          </button>
          <small>Kaynağı düzenleyip ekleyebilirsiniz. Bu alan henüz görsel denklem oluşturmaz; çıktı doğrulaması gereklidir.</small>
          <small>Şablonlar LaTeX metni olarak eklenir; Word çıktısında ayrıca doğrulanmalıdır.</small>
        </div>}
      </div>}
      {variant === 'stem' && <section className="p3-table-composer" aria-label="Tablo taslağı oluştur">
        <button type="button" disabled={disabled} aria-expanded={tableOpen} onClick={() => setTableOpen(open => !open)}>Tablo oluştur</button>
        {tableOpen && <div className="p3-table-panel">
          <p>Hücreleri doldurun. Metin tablosu oluşturulur; Word'de düzenlenebilir tablo desteği henüz yoktur.</p>
          <div className="p3-table-toolbar">
            <button type="button" disabled={disabled || tableRows.length >= 8} onClick={() => setTableRows(rows => [...rows, rows[0].map(() => '')])}>Satır ekle</button>
            <button type="button" disabled={disabled || tableRows.length <= 2} onClick={() => setTableRows(rows => rows.slice(0, -1))}>Satır sil</button>
            <button type="button" disabled={disabled || tableRows[0].length >= 5} onClick={() => setTableRows(rows => rows.map(row => [...row, '']))}>Sütun ekle</button>
            <button type="button" disabled={disabled || tableRows[0].length <= 2} onClick={() => setTableRows(rows => rows.map(row => row.slice(0, -1)))}>Sütun sil</button>
          </div>
          <div className="p3-table-scroll"><table><tbody>{tableRows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, columnIndex) =>
            <td key={columnIndex}><input aria-label={`Satır ${rowIndex + 1}, sütun ${columnIndex + 1}`} disabled={disabled} maxLength={80} value={cell}
              onChange={event => setTableRows(rows => rows.map((r, ri) => ri === rowIndex ? r.map((v, ci) => ci === columnIndex ? event.target.value : v) : r))}/></td>)}</tr>)}</tbody></table></div>
          <button type="button" disabled={disabled || tableRows.some(row => row.some(cell => cell.includes('|') || cell.includes('\\n')))}
            onMouseDown={event => event.preventDefault()} onClick={() => {
              const lines = tableRows.map(row => '| ' + row.map(cell => cell.trim()).join(' | ') + ' |');
              lines.splice(1, 0, '| ' + tableRows[0].map(() => '---').join(' | ') + ' |');
              editor.chain().focus().insertContent(lines.map(line => ({ type: 'paragraph', content: [{ type: 'text', text: line }] }))).run();
            }}>Metin tablosunu soru köküne ekle</button>
        </div>}
      </section>}
      {variant === 'stem' && <section className="p3-shape-composer" aria-label="Geometrik şekil hazırlama">
        <button type="button" disabled={disabled} aria-expanded={shapeOpen} onClick={() => setShapeOpen(open => !open)}>Geometri araçları</button>
        {shapeOpen && <div className="p3-shape-panel">
          <p>Şekli önizleyin ve soru metnine sembolik gösterimini ekleyin.</p>
          <div className="p3-shape-types" role="group" aria-label="Şekil türü">
            {([['triangle', 'Üçgen'], ['circle', 'Çember'], ['square', 'Kare']] as const).map(([kind, label]) =>
              <button type="button" key={kind} disabled={disabled} aria-pressed={shapeType === kind} onClick={() => setShapeType(kind)}>{label}</button>)}
          </div>
          <svg className="p3-shape-preview" viewBox="0 0 180 130" role="img" aria-label={shapeType === 'triangle' ? 'ABC üçgeni önizlemesi' : shapeType === 'circle' ? 'O merkezli çember önizlemesi' : 'ABCD karesi önizlemesi'}>
            {shapeType === 'triangle' ? <><polygon points="90,12 24,110 156,110" fill="none" stroke="currentColor" strokeWidth="2"/><text x="86" y="10">A</text><text x="9" y="122">B</text><text x="159" y="122">C</text></>
            : shapeType === 'circle' ? <><circle cx="90" cy="65" r="46" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="90" cy="65" r="2" fill="currentColor"/><text x="97" y="62">O</text></>
            : <><rect x="44" y="19" width="91" height="91" fill="none" stroke="currentColor" strokeWidth="2"/><text x="34" y="16">A</text><text x="141" y="16">B</text><text x="141" y="121">C</text><text x="34" y="121">D</text></>}
          </svg>
          <button type="button" disabled={disabled} onMouseDown={event => event.preventDefault()}
            onClick={() => editor.chain().focus().insertContent(shapeType === 'triangle' ? '△ABC' : shapeType === 'circle' ? '◯O' : '□ABCD').run()}>
            Şekil gösterimini ekle
          </button>
          <small>Bu işlem yalnızca sembolik metin ekler. SVG önizleme soru kaydına veya Word belgesine aktarılmaz.</small>
        </div>}
      </section>}
      {showLinkInput && (
        <div className="question-p2-link-dialog">
          <input
            type="url"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            placeholder="https://meb.gov.tr/..."
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSetLink();
              } else if (e.key === 'Escape') {
                setShowLinkInput(false);
              }
            }}
          />
          <button type="button" className="primary-button" onClick={handleSetLink}>
            Ekle
          </button>
          <button type="button" className="secondary-button" onClick={() => setShowLinkInput(false)}>
            Vazgeç
          </button>
        </div>
      )}

      <div className="question-p2-content-area" onClick={() => editor.chain().focus().run()}>
        <EditorContent editor={editor} />
        {!value.trim() && <span className="question-p2-placeholder" aria-hidden="true">{placeholder}</span>}
      </div>

      <div className="question-p2-footer" role="status" aria-live="polite">
        <span>{isOverLimit ? 'Kayıt sınırı aşıldı. İçerik kesilmez; kaydetmeden önce kısaltın.' : 'Biçimlendirme güvenli kayıt biçimine aktarılır.'}</span>
        <strong className={isOverLimit ? 'question-p2-limit-error' : ''}>
          {currentLength} / {maxLength}
        </strong>
      </div>
    </div>
  );
}
