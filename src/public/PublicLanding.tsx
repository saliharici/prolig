import { useEffect, useRef, useState } from 'react';
import { ArrowDownRight, ArrowRight, BookOpen, Check, ChevronRight, Menu, ShieldCheck, X } from 'lucide-react';
import './public-enterprise-v1.css';
import './publisher-ux02.css';

/** PRO-LIG is a publisher, not a SaaS vendor. No catalog records are fabricated. */
export interface PublicLandingProps {
  onLoginClick: () => void;
  onApplyClick: () => void;
  authenticated?: boolean;
  serviceNotice?: string;
  onRetryConnection?: () => void;
}

const navItems = [
  { href: '#yayinlar', label: 'Yayınlarımız' },
  { href: '#kurumsal', label: 'Kurumsal' },
  { href: '#editorial', label: 'Editoryal Yaklaşım' },
  { href: '#iletisim', label: 'Bizimle Çalışın' }
] as const;

export function PublicLanding({
  onLoginClick,
  onApplyClick,
  authenticated = false,
  serviceNotice,
  onRetryConnection
}: PublicLandingProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [menuOpen]);
  const closeMenu = () => setMenuOpen(false);
  const openLogin = () => { closeMenu(); onLoginClick(); };
  const openApplication = () => { closeMenu(); onApplyClick(); };

  return (
    <div className="public-shell public-v2 public-enterprise-v1 public-editorial-v2 publisher-theme prolig-publisher-ux02">
      <a className="ux02-skip" href="#public-content">Ana içeriğe geç</a>
      <header className="ux02-header">
        <div className="ux02-header-inner">
          <a href="#anasayfa" className="ux02-brand" onClick={closeMenu} aria-label="PRO-LİG Yayınevi, ana sayfa">
            <img src="/brand/prolig-logo-primary.png" alt="PRO-LİG" />
            <span className="ux02-brand-descriptor">YAYINEVİ</span>
          </a>
          <nav className="ux02-nav-desktop" aria-label="Kurumsal sayfa">
            {navItems.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}
          </nav>
          <div className="ux02-header-actions">
            {!authenticated && <button type="button" className="ux02-link-action" onClick={openApplication}>Yazar ve Editör Başvurusu</button>}
            <button type="button" className="ux02-button ux02-button-primary ux02-header-login" onClick={openLogin}>
              {authenticated ? 'Çalışma Alanına Dön' : 'Çalışan Girişi'} <ArrowRight size={16} aria-hidden="true"/>
            </button>
          </div>
          <button
            type="button" className="ux02-menu-toggle" ref={menuButtonRef}
            aria-expanded={menuOpen} aria-controls="ux02-mobile-navigation"
            aria-label={menuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
            onClick={() => setMenuOpen(open => !open)}
          >{menuOpen ? <X size={23} aria-hidden="true" /> : <Menu size={23} aria-hidden="true" />}</button>
        </div>
        <nav id="ux02-mobile-navigation" className={'ux02-mobile-nav' + (menuOpen ? ' open' : '')}
          aria-label="Mobil kurumsal sayfa" inert={!menuOpen}>
          {navItems.map(item => <a key={item.href} href={item.href} onClick={closeMenu}>{item.label}<ChevronRight size={17} aria-hidden="true"/></a>)}
          {!authenticated && <button type="button" onClick={openApplication}>Yazar ve Editör Başvurusu <ArrowRight size={17}/></button>}
          <button type="button" className="ux02-mobile-login" onClick={openLogin}>{authenticated ? 'Çalışma Alanına Dön' : 'Çalışan Girişi'} <ArrowRight size={17}/></button>
        </nav>
      </header>

      {serviceNotice && <div className="ux02-service-notice" role="status">
        <div><ShieldCheck size={19} aria-hidden="true"/><p><strong>Oturum hizmeti şu anda doğrulanamadı.</strong> {serviceNotice}</p></div>
        {onRetryConnection && <button type="button" onClick={onRetryConnection}>Yeniden dene <ArrowRight size={14}/></button>}
      </div>}

      <main id="public-content" className="ux02-main">
        <section className="ux02-hero" id="anasayfa" aria-labelledby="ux02-hero-title">
          <div className="ux02-hero-copy">
            <div className="ux02-eyebrow"><span className="ux02-eyebrow-rule"/> PRO-LİG / YAYINCILIK</div>
            <h1 id="ux02-hero-title">Nitelikli içerik, <em>güçlü bir yayın anlayışı.</em></h1>
            <p className="ux02-hero-description">Eğitim yayınlarını, içerik kalitesi ve editoryal sorumluluğu temel alarak hazırlıyoruz.</p>
            <div className="ux02-hero-actions">
              <a href="#yayinlar" className="ux02-button ux02-button-primary">Yayınlarımız <ArrowRight size={17} aria-hidden="true"/></a>
              <a href="#kurumsal" className="ux02-button ux02-button-light">Bizi Tanıyın <ArrowDownRight size={17} aria-hidden="true"/></a>
            </div>
            <div className="ux02-hero-byline"><span className="ux02-byline-rule"/><span>PRO-LİG Yayınevi</span></div>
          </div>
          <div className="ux02-hero-art" role="img" aria-label="PRO-LİG kurumsal tipografik motifi. Bu bir kitap kapağı değildir.">
            <div className="ux02-art-heading"><span>KURUMSAL GRAFİK</span><span>PRO-LİG YAYINEVİ</span></div>
            <div className="ux02-art-composition" aria-hidden="true">
              <div className="ux02-art-orbit ux02-art-orbit-one" />
              <div className="ux02-art-orbit ux02-art-orbit-two" />
              <div className="ux02-art-orbit ux02-art-orbit-three" />
              <span className="ux02-art-letter">P</span><span className="ux02-art-dot">.</span>
            </div>
            <p className="ux02-art-legend">Yayıncılık kimliğimiz için tipografik motif. Gerçek kitap kapağı veya yayımlanmış eser görseli değildir.</p>
          </div>
        </section>

        <section id="yayinlar" className="ux02-section ux02-publications" aria-labelledby="ux02-publications-title">
          <div className="ux02-section-heading">
            <span className="ux02-section-kicker">01 / YAYINLARIMIZ</span>
            <h2 id="ux02-publications-title">İçeriğin değerine <em>inanıyoruz.</em></h2>
            <p>PRO-LİG yayınlarını doğrulanmış bilgileriyle tanıtmayı önemsiyoruz.</p>
          </div>
          <div className="ux02-publications-summary">
            <BookOpen size={28} strokeWidth={1.4} aria-hidden="true" />
            <p><strong>Yayın seçkisi</strong><span>Doğrulanmış kitap ve katalog bilgileri eklendikçe bu alanda yer alacaktır.</span></p>
            <a href="#editorial">Yayın anlayışımız <ArrowRight size={16} aria-hidden="true"/></a>
          </div>
        </section>

        <section id="kurumsal" className="ux02-section ux02-institution" aria-labelledby="ux02-corporate-title">
          <div className="ux02-institution-inner">
            <div className="ux02-institution-label"><span className="ux02-section-kicker">02 / KURUMSAL</span><span className="ux02-institution-sign" aria-hidden="true">PL<span>.</span></span></div>
            <div className="ux02-institution-copy">
              <h2 id="ux02-corporate-title">Yayıncılığı yalnızca basılı sayfalardan <em>ibaret görmüyoruz.</em></h2>
              <p>PRO-LİG, içerik üretimini editoryal değerlendirmeyle birlikte ele alan bir yayınevidir.</p>
              <div className="ux02-institution-points">
                <span><Check size={16} aria-hidden="true"/> İçeriğe saygı</span>
                <span><Check size={16} aria-hidden="true"/> Editoryal özen</span>
                <span><Check size={16} aria-hidden="true"/> Birlikte üretim</span>
              </div>
            </div>
          </div>
        </section>

        <section id="editorial" className="ux02-section ux02-editorial" aria-labelledby="ux02-editorial-title">
          <div className="ux02-section-heading ux02-editorial-heading">
            <span className="ux02-section-kicker">03 / EDİTORYAL YAKLAŞIM</span>
            <h2 id="ux02-editorial-title">İyi bir yayının arkasında <em>özenli bir süreç vardır.</em></h2>
            <p>Yazar ve editör işbirliği, yayın hazırlığının temelidir.</p>
          </div>
          <div className="ux02-editorial-steps">
            <article><span>01</span><h3>İçerik üretimi</h3><p>İçeriğin amacı, kapsamı ve anlatım biçimi gözetilerek hazırlık yapılır.</p></article>
            <article><span>02</span><h3>Editoryal inceleme</h3><p>Açıklık, tutarlılık ve yayın bütünlüğü açısından değerlendirme yapılır.</p></article>
            <article><span>03</span><h3>Yayın hazırlığı</h3><p>İçeriğin bir bütün olarak sunulmasına yönelik son hazırlıklar ele alınır.</p></article>
          </div>
        </section>

        <section id="iletisim" className="ux02-section ux02-contact" aria-labelledby="ux02-contact-title">
          <div className="ux02-contact-copy">
            <span className="ux02-section-kicker">04 / BİZİMLE ÇALIŞIN</span>
            <h2 id="ux02-contact-title">Birlikte <em>üretelim.</em></h2>
            <p>Yazar veya editör olarak ekibimize katılmak için başvuru ekranını kullanabilirsiniz.</p>
          </div>
          {!authenticated && <button type="button" className="ux02-button ux02-button-cream" onClick={openApplication}>Yazar ve Editör Başvurusu <ArrowRight size={17} aria-hidden="true"/></button>}
        </section>
      </main>
      <footer className="ux02-footer">
        <div className="ux02-footer-inner">
          <a href="#anasayfa" className="ux02-footer-logo"><img src="/brand/prolig-logo-primary.png" alt="PRO-LİG" /><span>YAYINEVİ</span></a>
          <p>© {new Date().getFullYear()} PRO-LİG Yayınevi. Tüm hakları saklıdır.</p>
          <a href="#anasayfa">Başa dön <ArrowRight size={15} aria-hidden="true"/></a>
        </div>
      </footer>
    </div>
  );
}
