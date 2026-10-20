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
              onClick={() => editor.chain().focus().insertContent('
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
 + template + '
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
).run()}>{label}</button>)}
          <small>Şablonlar LaTeX metni olarak eklenir; Word çıktısında ayrıca doğrulanmalıdır.</small>
        </div>}
      </div>}
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
