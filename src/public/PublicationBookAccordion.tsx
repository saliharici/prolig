import { useEffect, useState } from 'react';
import { ArrowUpRight, ChevronRight, Pause, Play } from 'lucide-react';
import './publication-book-accordion.css';

type PublicationItem = {
  short: string;
  category: string;
  headline: string;
  description: string;
  cta: string;
  href?: string;
  action?: 'apply';
};

/**
 * UX-05: truthful editorial showcase, not a fabricated book catalog or live news feed.
 * The visual book jackets are decorative and explicitly labelled as representations.
 * Replace this editorial data with verified publication records when available.
 */
const items: PublicationItem[] = [
  {
    short: 'Yayın Kataloğu',
    category: '01 / YAYIN VİTRİNİ',
    headline: 'Yeni sayfalar için yer açıyoruz.',
    description: 'PRO-LİG yayınlarına ait doğrulanmış kapaklar ve katalog bilgileri, yayıma hazır olduklarında bu vitrinde yerini alacak.',
    cta: 'Yayın anlayışımız',
    href: '#editorial',
  },
  {
    short: 'İçerik Üretimi',
    category: '02 / HAZIRLIK SÜRECİ',
    headline: 'Her yayın bir fikirle başlar.',
    description: 'Eğitim içerikleri amaç, kapsam ve anlatım bütünlüğü gözetilerek hazırlanır; birlikte üretmeye önem veriyoruz.',
    cta: 'Nasıl çalışıyoruz?',
    href: '#editorial',
  },
  {
    short: 'Editoryal İnceleme',
    category: '03 / EDİTORYAL GÜNDEM',
    headline: 'Özen, her ayrıntıda saklıdır.',
    description: 'İçerikler açıklık, tutarlılık ve yayın bütünlüğü açısından değerlendirilir. Editoryal yaklaşımımızı keşfedin.',
    cta: 'Editoryal yaklaşım',
    href: '#editorial',
  },
  {
    short: 'Birlikte Üretelim',
    category: '04 / EKİBİMİZE KATILIN',
    headline: 'Yeni fikirlerde buluşalım.',
    description: 'Yazar veya editör olarak PRO-LİG yayın ekibine katılmak için mevcut başvuru ekranımızdan bize ulaşabilirsiniz.',
    cta: 'Yazar ve editör başvurusu',
    action: 'apply',
  },
];

export interface PublicationBookAccordionProps {
  onApplyClick: () => void;
}

export function PublicationBookAccordion({ onApplyClick }: PublicationBookAccordionProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => setReducedMotion(motionQuery.matches);
    const syncVisibility = () => setHidden(document.visibilityState !== 'visible');
    syncVisibility();
    motionQuery.addEventListener('change', syncMotion);
    document.addEventListener('visibilitychange', syncVisibility);
    return () => {
      motionQuery.removeEventListener('change', syncMotion);
      document.removeEventListener('visibilitychange', syncVisibility);
    };
  }, []);

  const suspended = paused || hovered || focused || hidden || reducedMotion;
  useEffect(() => {
    if (suspended) return;
    const interval = window.setInterval(() => setActive(index => (index + 1) % items.length), 7000);
    return () => window.clearInterval(interval);
  }, [suspended]);

  return (
    <section
      className="ux05-publication-feed"
      aria-label="PRO-LİG yayın vitrini ve editoryal akış"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <div className="ux05-feed-heading">
        <div className="ux05-feed-labels">
          <span className="ux05-overline">PRO-LİG / YAYIN VİTRİNİ</span>
          <strong>Yayınlardan önce, yayıncılığın hikâyesi.</strong>
        </div>
        <div className="ux05-feed-controls">
          <span className="ux05-feed-count" aria-label={`${active + 1}. bölüm, toplam ${items.length} bölüm`}>
            {String(active + 1).padStart(2, '0')} <span>/ {String(items.length).padStart(2, '0')}</span>
          </span>
          <button
            type="button"
            onClick={() => setPaused(value => !value)}
            aria-pressed={paused}
            aria-label={paused ? 'Yayın akışını otomatik oynat' : 'Yayın akışını duraklat'}
            title={paused ? 'Akışı sürdür' : 'Akışı duraklat'}
          >
            {paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
            <span>{paused ? 'Sürdür' : 'Duraklat'}</span>
          </button>
        </div>
      </div>

      <div className="ux05-bookshelf" aria-label="Yayın vitrini bölümleri">
        {items.map((item, index) => {
          const isActive = active === index;
          return (
            <article key={item.category} className={`ux05-book-card${isActive ? ' is-active' : ''}`}>
              <button
                type="button"
                className="ux05-book-spine"
                onClick={() => { setActive(index); setPaused(true); }}
                aria-expanded={isActive}
                aria-controls={`ux05-book-content-${index}`}
                aria-label={`${item.short} bölümünü ${isActive ? 'görüntüle' : 'aç'}`}
              >
                <span className="ux05-spine-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="ux05-spine-title">{item.short}</span>
                <ChevronRight size={16} aria-hidden="true" />
              </button>
              <div id={`ux05-book-content-${index}`} className="ux05-book-content" hidden={!isActive}>
                <div className="ux05-book-copy">
                  <span className="ux05-book-category">{item.category}</span>
                  <h3>{item.headline}</h3>
                  <p>{item.description}</p>
                  {item.action === 'apply' ? (
                    <button type="button" className="ux05-book-cta" onClick={onApplyClick}>
                      {item.cta}<ArrowUpRight size={17} aria-hidden="true"/>
                    </button>
                  ) : (
                    <a href={item.href} className="ux05-book-cta">
                      {item.cta}<ArrowUpRight size={17} aria-hidden="true"/>
                    </a>
                  )}
                </div>
                <div className="ux05-book-display" aria-hidden="true">
                  <div className="ux05-illustrated-book">
                    <div className="ux05-cover-head"><span>PRO-LİG</span><span>YAYINEVİ</span></div>
                    <div className="ux05-cover-emblem"><span>P</span></div>
                    <div className="ux05-cover-foot">
                      <strong>YAYIN VİTRİNİ</strong>
                      <span>TEMSİLÎ TASARIM</span>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="ux05-feed-bottom">
        <span><i aria-hidden="true" /> Kitap formundaki görseller temsildir; yayımlanmış eser veya gerçek kitap kapağı değildir.</span>
        <span>Bir bölüme tıklayarak akışı durdurabilirsiniz.</span>
      </div>
    </section>
  );
}
