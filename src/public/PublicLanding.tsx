import { ArrowRight, ArrowUpRight } from 'lucide-react';
import './public-enterprise-v1.css';

/**
 * Public site only. Examples below are editorial mock content, not live records.
 * Real auth, membership, project and question flows are owned by their existing modules.
 */
const platformAreas = [
  {
    number: '01',
    eyebrow: 'PLANLAMA',
    heading: 'Önce yayın planı.',
    copy: 'Hangi sınıf, hangi ders, kimlerle ve ne zaman? Yayın projesinin kapsamı ile görev dağılımı aynı yerde tanımlanır.',
    capabilities: ['Proje Yönetimi', 'Görev Takibi', 'Yazar Ağı']
  },
  {
    number: '02',
    eyebrow: 'EDİTORYAL SÜREÇ',
    heading: 'Sonra nitelikli içerik.',
    copy: 'Yazarın hazırladığı soru editöre ulaşır. Revizyon ve değerlendirme adımları işin bağlamından kopmadan izlenir.',
    capabilities: ['Soru Üretimi', 'Editör İncelemesi', 'Kurumsal Mesajlar']
  },
  {
    number: '03',
    eyebrow: 'YÖNETİM',
    heading: 'Her adımın kaydı.',
    copy: 'Yetki kapsamı, işlem geçmişi ve telif süreçleri üretimin dışında kalan ayrı işler değil; yayın sürecinin parçalarıdır.',
    capabilities: ['Rol & Yetki', 'İşlem Geçmişi', 'Telif ve Ödemeler']
  }
];

const stages = [
  { number: 'I', title: 'Yayın dosyası', detail: 'Kapsam ve ekip belirlenir.' },
  { number: 'II', title: 'Yazar masası', detail: 'Sorular hazırlanır.' },
  { number: 'III', title: 'Editör kontrolü', detail: 'İnceleme ve revizyon yapılır.' },
  { number: 'IV', title: 'Yayın kararı', detail: 'Son durum kayıt altına alınır.' }
];

export function PublicLanding({
  onLoginClick,
  onApplyClick,
  authenticated = false
}: {
  onLoginClick: () => void;
  onApplyClick: () => void;
  authenticated?: boolean;
}) {
  return (
    <div className="public-shell public-v2 public-enterprise-v1 public-editorial-v2">
      <a className="public-skip-link" href="#public-content">Ana içeriğe geç</a>

      <header className="public-header">
        <div className="public-header-inner">
          <a className="public-brand public-brand-image-link" href="#anasayfa" aria-label="PRO-LİG ana sayfa">
            <img className="public-brand-logo" src="/brand/prolig-logo-primary.png" alt="PRO-LİG — Yayın ve İçerik Yönetim Platformu" />
          </a>
          <nav className="public-nav" aria-label="Sayfa bölümleri">
            <a href="#anasayfa">Ana Sayfa</a>
            <a href="#platform">Platform</a>
            <a href="#projeler">Projeler</a>
            <a href="#nasil-calisir">Nasıl Çalışır</a>
            <a href="#yayin-projesi">Yayın Akışı</a>
          </nav>
          <div className="public-header-actions">
            {!authenticated && <button className="public-ghost-button" onClick={onApplyClick}>Üyelik Başvurusu</button>}
            <button className="public-primary-button compact" onClick={onLoginClick}>
              {authenticated ? 'Çalışma Alanına Dön' : 'Giriş Yap'} <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <nav className="public-mobile-nav" aria-label="Mobil bölüm bağlantıları">
        <a href="#platform">Platform</a>
        <a href="#projeler">Projeler</a>
        <a href="#nasil-calisir">İş Akışı</a>
        <a href="#yayin-projesi">Yayın Akışı</a>
      </nav>

      <main className="public-main" id="public-content">
        <section className="public-hero public-major-section" id="anasayfa" aria-labelledby="public-hero-heading">
          <div className="public-hero-copy">
            <p className="editorial-label">PRO-LİG <span aria-hidden="true">/</span> YAYIN VE İÇERİK YÖNETİMİ</p>
            <h1 id="public-hero-heading">Bir soru bankası, <span>yalnız sorulardan oluşmaz.</span></h1>
            <p className="editorial-lead">Arkasında bir yayın planı, yazarlar, editörler ve sayısız küçük karar vardır. PRO-LİG, bütün bu çalışmaları aynı zeminde buluşturur.</p>
            <div className="public-hero-actions">
              <button className="public-primary-button" onClick={onLoginClick}>
                {authenticated ? 'Çalışma Alanına Dön' : 'Çalışma Alanına Giriş'} <ArrowUpRight size={16} aria-hidden="true" />
              </button>
              {!authenticated && <button className="public-secondary-button" onClick={onApplyClick}>Üyelik Başvurusu</button>}
            </div>
            <a className="editorial-inline-link" href="#projeler">Bir yayın nasıl hazırlanır? <ArrowRight size={16} aria-hidden="true" /></a>
          </div>

          <div className="public-hero-visual editorial-proof" aria-label="Temsili soru sayfası ve editör incelemesi">
            <div className="editorial-proof-top"><span>YAZAR / EDİTÖR MASASI</span><span>ÖRNEK ÇALIŞMA · 001</span></div>
            <div className="editorial-proof-page">
              <div className="editorial-proof-meta"><span>MATEMATİK / 8. SINIF</span><span>ÇALIŞMA TASLAĞI</span></div>
              <div className="editorial-proof-rule" />
              <p className="editorial-proof-kicker">ÖRNEK SORU — 01</p>
              <p className="editorial-proof-question">Bir dikdörtgenin kısa kenarı 4 cm, uzun kenarı ise kısa kenarının iki katıdır. Bu dikdörtgenin çevresi kaç santimetredir?</p>
              <div className="editorial-proof-answers" aria-label="Temsili cevap seçenekleri">
                <span>A) 16</span><span>B) 20</span><span className="editorial-proof-answer">C) 24</span><span>D) 32</span>
              </div>
              <div className="editorial-proof-note"><span>EDİTÖR NOTU / 01</span><p>Seçeneklerin birbirinden ayırt edilebilirliğini yeniden gözden geçir.</p></div>
              <div className="editorial-proof-bottom"><span>YAZAR TASLAĞI</span><span>→</span><span>EDİTÖR İNCELEMESİ</span><span>→</span><span>REVİZYON</span></div>
            </div>
            <p className="editorial-proof-disclaimer">Temsili ürün görünümü · Gerçek kullanıcı verisi içermez.</p>
          </div>
        </section>

        <section className="editorial-case public-major-section" id="projeler" aria-labelledby="editorial-case-title">
          <div className="editorial-case-intro">
            <span className="editorial-label">YAYIN DOSYASI / ÖRNEK</span>
            <h2 id="editorial-case-title">İyi hazırlanmış bir içerik, <em>iyi yönetilmiş bir sürecin sonucudur.</em></h2>
          </div>
          <div className="editorial-case-spread">
            <div className="editorial-case-record">
              <div className="editorial-case-record-head"><span>DOSYA NO. 001</span><span>TEMSİLİ PROJE</span></div>
              <h3>8. Sınıf Matematik<br />Soru Bankası</h3>
              <p>Örnek bir yayın dosyasının temel bilgileri.</p>
              <dl>
                <div><dt>Kapsam</dt><dd>Ortaokul · Matematik</dd></div>
                <div><dt>Ekip</dt><dd>Yazar ve editör ekibi</dd></div>
                <div><dt>İçerik</dt><dd>Soru üretimi ve inceleme</dd></div>
              </dl>
            </div>
            <div className="editorial-case-story">
              <span className="editorial-label">BİR YAYININ İZİNİ SÜRÜN</span>
              <p className="editorial-case-quote">“Kim hazırladı, hangi aşamada, sırada kim var?”</p>
              <p>Bu soruların cevabı ayrı tabloların, mesajların veya kişisel notların arasında kaybolmamalı. Proje, görev ve içerik aynı iş akışında birbirine bağlanmalı.</p>
              <a href="#nasil-calisir" className="editorial-inline-link">Yayın sürecini görün <ArrowRight size={16} aria-hidden="true" /></a>
            </div>
          </div>
        </section>

        <section className="editorial-capabilities public-major-section" id="platform" aria-labelledby="editorial-capabilities-title">
          <div className="editorial-section-heading">
            <span className="editorial-label">PLATFORM / ÜÇ TEMEL ALAN</span>
            <h2 id="editorial-capabilities-title">Yayın işinin her tarafı, <em>birbiriyle konuşmalı.</em></h2>
            <p>PRO-LİG, birbirinden kopuk araçlar yerine yayın ekibinin iş yapma biçimine odaklanır.</p>
          </div>
          <div className="editorial-capability-list">
            {platformAreas.map(area => (
              <article className="editorial-capability" key={area.number}>
                <span className="editorial-capability-number">{area.number} / {area.eyebrow}</span>
                <div className="editorial-capability-body">
                  <h3>{area.heading}</h3><p>{area.copy}</p>
                </div>
                <div className="editorial-capability-tags" aria-label={`${area.heading} özellikleri`}>
                  {area.capabilities.map(capability => <span key={capability}>{capability}</span>)}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="editorial-process public-major-section" id="nasil-calisir" aria-labelledby="editorial-process-title">
          <div className="editorial-process-inner">
            <div className="editorial-process-heading">
              <span className="editorial-label">YAYIN ÜRETİMİNİN DÖRT AŞAMASI</span>
              <h2 id="editorial-process-title">Masadan masaya değil, <em>aşamadan aşamaya.</em></h2>
              <p>Bir sorunun yaşam döngüsü, yayın kararına kadar görünür olmalı.</p>
            </div>
            <ol className="editorial-process-steps">
              {stages.map(stage => (
                <li key={stage.number}>
                  <span className="editorial-stage-number">{stage.number}</span>
                  <div><h3>{stage.title}</h3><p>{stage.detail}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="editorial-outro public-major-section" id="yayin-projesi" aria-labelledby="editorial-outro-title">
          <span className="editorial-label">YAYIN AKIŞI / ORTAK ÇALIŞMA</span>
          <div className="editorial-outro-layout">
            <h2 id="editorial-outro-title">Yayın kalitesi, <em>birlikte çalışmanın sonucudur.</em></h2>
            <div><p>Yazarın emeğini, editörün değerlendirmesini ve koordinatörün planlamasını aynı süreçte buluşturun.</p>
              <button className="editorial-inline-button" onClick={onLoginClick}>
                {authenticated ? 'Çalışma Alanına Dön' : 'Çalışma Alanına Giriş'} <ArrowUpRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      </main>
      <footer className="public-footer">
        <div className="public-brand footer-brand footer-brand-image">
          <img className="public-brand-logo footer-brand-logo" src="/brand/prolig-logo-primary.png" alt="PRO-LİG — Yayın ve İçerik Yönetim Platformu" />
        </div>
        <span>© {new Date().getFullYear()} Pro-Lig Platformu · Yayın ve İçerik Yönetimi</span>
      </footer>
    </div>
  );
}
