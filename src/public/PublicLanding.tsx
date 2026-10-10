import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileQuestion,
  GraduationCap,
  History,
  ListChecks,
  MessageSquareText,
  PenTool,
  ShieldCheck,
  Users,
  Workflow
} from 'lucide-react';

const projectPulse = [
  {
    status: 'DEVAM EDİYOR',
    code: 'PILOT-MAT-8-001',
    title: '8. Sınıf Matematik Pilot Soru Bankası',
    meta: 'Pilot doğrulama akışı',
    signal: 'Üretim aktif',
    badge: '8. Sınıf'
  },
  {
    status: 'KONTROL',
    code: 'EDİTÖR AKIŞI',
    title: 'İçerik inceleme ve revizyon döngüsü',
    meta: 'Rol bazlı kontrol',
    signal: 'İnceleme',
    badge: 'Editör'
  },
  {
    status: 'PLANLAMA',
    code: 'YENİ PROJE',
    title: 'Yeni yayın projeleri için ekip ve görev planlama',
    meta: 'Proje yönetimi',
    signal: 'Ekip planı',
    badge: 'Hazırlık'
  }
];

const platformFeatures = [
  { icon: BookOpen, title: 'Proje Yönetimi', copy: 'Proje kapsamı, sınıf, branş, ekip ve yaşam döngüsünü tek yerde yönetin.' },
  { icon: ListChecks, title: 'Görev Takibi', copy: 'Görevleri atayın, terminleri izleyin ve kontrol bekleyen işleri görün.' },
  { icon: FileQuestion, title: 'Soru Üretimi', copy: 'Yazar–editör üretim ve inceleme akışını proje kapsamıyla birlikte yürütün.' },
  { icon: MessageSquareText, title: 'Kurumsal Mesajlar', copy: 'Yetki kapsamındaki ekip üyeleriyle kayıtlı ve kontrollü iletişim kurun.' },
  { icon: Users, title: 'Yazar Ağı', copy: 'Yazarları branş ve coğrafi kapsamlarıyla birlikte yönetin.' },
  { icon: CreditCard, title: 'Hakedişler', copy: 'Onaylanan üretimi ödeme ve hakediş sürecine kontrollü biçimde taşıyın.' },
  { icon: ShieldCheck, title: 'Rol & Yetki', copy: 'Her rol yalnız kendi görev ve sorumluluk alanındaki veriyi görür.' },
  { icon: History, title: 'İşlem Geçmişi', copy: 'Kritik işlemleri denetlenebilir bir kayıt iziyle takip edin.' }
];

const processSteps = [
  { no: '01', icon: BookOpen, title: 'Projeyi oluştur', copy: 'Branş, hedef sınıf ve proje kapsamını tanımlayın.' },
  { no: '02', icon: Users, title: 'Ekibi oluştur', copy: 'Yetki kapsamındaki yazar ve koordinasyon ekibini projeye bağlayın.' },
  { no: '03', icon: ClipboardCheck, title: 'Görevleri ata', copy: 'Sorumlu, öncelik ve termin bilgileriyle üretim işlerini planlayın.' },
  { no: '04', icon: PenTool, title: 'İçeriği üret', copy: 'Yazarlar proje ve branş kapsamındaki içerikleri hazırlar.' },
  { no: '05', icon: ShieldCheck, title: 'Kontrol et', copy: 'Editör ve koordinatörler inceleme, revizyon ve onay akışını yürütür.' },
  { no: '06', icon: CheckCircle2, title: 'Süreci tamamla', copy: 'Onaylanan üretim proje ve hakediş akışına taşınır.' }
];

export function PublicLanding({ onLoginClick, onApplyClick }: { onLoginClick: () => void; onApplyClick: () => void }) {
  return (
    <div className="public-shell public-v2">
      <div className="public-ambient public-ambient-one" />
      <div className="public-ambient public-ambient-two" />

      <header className="public-header">
        <div className="public-header-inner">
          <a className="public-brand public-brand-image-link" href="#anasayfa" aria-label="PRO-LİG ana sayfa">
            <img
              className="public-brand-logo"
              src="/prolig-logo.webp"
              alt="PRO-LİG — Yayın ve İçerik Yönetim Platformu"
            />
          </a>

          <nav className="public-nav" aria-label="Sayfa bölümleri">
            <a href="#anasayfa">Ana Sayfa</a>
            <a href="#platform">Platform</a>
            <a href="#projeler">Projeler</a>
            <a href="#nasil-calisir">Nasıl Çalışır</a>
            <a href="#pilot">Pilot</a>
          </nav>

          <div className="public-header-actions">
            <button className="public-ghost-button" onClick={onApplyClick}>Üyelik Başvurusu</button>
            <button className="public-primary-button compact" onClick={onLoginClick}>
              Giriş Yap <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="public-main">
        <section id="anasayfa" className="public-hero public-major-section public-v2-hero">
          <div className="public-hero-copy">
            <div className="public-hero-eyebrow">
              <span /> YAYIN OPERASYON PLATFORMU
            </div>
            <h1>
              Yayın üretiminden
              <span>ekip koordinasyonuna.</span>
            </h1>
            <p>
              Proje, soru üretimi, görev takibi, kurumsal mesajlaşma ve hakediş süreçlerini
              rol bazlı, izlenebilir ve tek merkezden yönetilen bir çalışma alanında birleştirin.
            </p>

            <div className="public-hero-actions">
              <button className="public-primary-button" onClick={onLoginClick}>
                Canlı Sistemi İncele <ArrowUpRight size={17} />
              </button>
              <button className="public-secondary-button" onClick={onApplyClick}>
                Üyelik Başvurusu
              </button>
            </div>

            <div className="public-trust-row">
              <div><ShieldCheck size={15} /><span>Rol bazlı yetkilendirme</span></div>
              <div><Workflow size={15} /><span>Proje → görev → içerik akışı</span></div>
              <div><History size={15} /><span>İzlenebilir süreç</span></div>
            </div>
          </div>

          <div className="public-hero-visual" aria-label="PRO-LİG operasyon merkezi ürün önizlemesi">
            <div className="public-v2-console">
              <div className="public-v2-console-head">
                <div className="public-product-preview-brand">
                  <span className="public-product-preview-mark">P</span>
                  <div>
                    <small>PRO-LİG</small>
                    <strong>OPERASYON MERKEZİ</strong>
                  </div>
                </div>
                <span className="public-product-preview-live"><i /> Ürün Önizlemesi</span>
              </div>

              <div className="public-v2-console-body">
                <div className="public-v2-console-caption">
                  <div>
                    <span>TEK ÇALIŞMA ALANI</span>
                    <strong>Yayın üretim sürecinin merkez görünümü</strong>
                  </div>
                  <Workflow size={18} />
                </div>

                <div className="public-v2-module-grid">
                  <div><BookOpen size={17}/><span><small>PROJELER</small><strong>Kapsam ve ekip</strong></span></div>
                  <div><ListChecks size={17}/><span><small>GÖREVLER</small><strong>Termin ve sorumlu</strong></span></div>
                  <div><FileQuestion size={17}/><span><small>SORULAR</small><strong>Üretim ve kontrol</strong></span></div>
                  <div><MessageSquareText size={17}/><span><small>MESAJLAR</small><strong>Ekip iletişimi</strong></span></div>
                </div>

                <div className="public-v2-focus">
                  <div className="public-v2-focus-top">
                    <div>
                      <span>PİLOT AKIŞ</span>
                      <strong>8. Sınıf Matematik Pilot Soru Bankası</strong>
                    </div>
                    <em>PILOT-MAT-8-001</em>
                  </div>
                  <div className="public-v2-progress-track"><span /></div>
                  <div className="public-v2-focus-flow">
                    <span><i className="done"/> Proje</span>
                    <span><i className="done"/> Görev</span>
                    <span><i className="active"/> Üretim</span>
                    <span><i/> Kontrol</span>
                  </div>
                </div>

                <div className="public-v2-console-note">
                  <ShieldCheck size={15}/>
                  <span><strong>Yetki kontrollü çalışma alanı</strong><small>Her rol yalnız kendi kapsamındaki işi görür.</small></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="projeler" className="public-pulse-section public-major-section">
          <div className="public-pulse-heading">
            <div>
              <span className="public-overline">PROJE NABZI</span>
              <h2>Yayın projeleri hareket halinde.</h2>
            </div>
            <p>Bu alan, kamuya açık tanıtım için güvenli proje akışı örneklerini gösterir; iç sistem verileri yayınlanmaz.</p>
          </div>

          <div className="public-pulse-shell" aria-label="Proje nabzı akan proje bandı">
            <div className="public-pulse-label">
              <span className="public-pulse-live-dot"/>
              <div>
                <strong>PROJE NABZI</strong>
                <small>YAYIN OPERASYONU</small>
              </div>
            </div>
            <div className="public-pulse-viewport">
              <div className="public-pulse-fade public-pulse-fade-left" />
              <div className="public-pulse-fade public-pulse-fade-right" />
              <div className="public-pulse-track">
                {[0, 1].map(copy => (
                  <div className="public-pulse-copy" key={copy} aria-hidden={copy === 1 ? true : undefined}>
                    {projectPulse.map(item => (
                      <article className="public-pulse-item" key={`${copy}-${item.code}`}>
                        <span className={`public-pulse-status status-${item.status.toLocaleLowerCase('tr-TR').replaceAll(' ', '-').replaceAll('İ','i').replaceAll('ı','i')}`}>
                          <i /> {item.status}
                        </span>
                        <div className="public-pulse-project">
                          <strong>{item.title}</strong>
                          <small>{item.code} <b>•</b> {item.meta}</small>
                        </div>
                        <div className="public-pulse-signal">
                          <small>AKIŞ</small>
                          <strong>{item.signal}</strong>
                        </div>
                        <span className="public-pulse-badge">{item.badge}</span>
                        <ArrowRight className="public-pulse-arrow" size={16}/>
                      </article>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="platform" className="public-platform-section public-major-section">
          <div className="public-section-heading public-v2-section-heading">
            <span className="public-overline">PLATFORM YETENEKLERİ</span>
            <h2>Yalnız içerik değil, bütün üretim operasyonu.</h2>
            <p>PRO-LİG, yayın üretiminin farklı parçalarını aynı yetki ve denetim modeli altında bir araya getirir.</p>
          </div>

          <div className="public-feature-grid">
            {platformFeatures.map(({ icon: Icon, title, copy }) => (
              <article className="public-feature-card" key={title}>
                <div className="public-feature-icon"><Icon size={19}/></div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="nasil-calisir" className="public-process-section public-major-section public-v2-process">
          <div className="public-section-heading public-v2-section-heading">
            <span className="public-overline">UÇTAN UCA İŞ AKIŞI</span>
            <h2>Projeden onaya kadar herkes ne yapacağını bilir.</h2>
            <p>Süreç proje kapsamıyla başlar, görev ve üretim akışından geçerek denetlenebilir biçimde tamamlanır.</p>
          </div>

          <div className="public-v2-process-grid">
            {processSteps.map(({ no, icon: Icon, title, copy }) => (
              <article className="public-v2-process-card" key={no}>
                <div className="public-v2-process-top">
                  <div className="public-card-icon teal"><Icon size={20}/></div>
                  <span>{no}</span>
                </div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="pilot" className="public-project-section public-major-section public-v2-pilot">
          <div className="public-pilot-summary">
            <div className="public-pilot-copy">
              <span className="public-overline">REFERANS PİLOT</span>
              <h2>8. Sınıf Matematik Pilot Soru Bankası</h2>
              <p>
                PILOT-MAT-8-001, PRO-LİG'in proje, görev, içerik ve kontrol iş akışını
                kontrollü biçimde doğrulamak için kullanılan referans pilot çalışmadır.
              </p>
            </div>
            <div className="public-project-meta">
              <div>
                <GraduationCap size={18} />
                <span><small>KADEME</small><strong>Ortaokul</strong></span>
              </div>
              <div>
                <Users size={18} />
                <span><small>YAZAR KADROSU</small><strong>Pilot Yazar Ağı</strong></span>
              </div>
              <div>
                <BookOpen size={18} />
                <span><small>PROJE KODU</small><strong>PILOT-MAT-8-001</strong></span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="public-footer">
        <div className="public-brand footer-brand footer-brand-image">
          <img
            className="public-brand-logo footer-brand-logo"
            src="/prolig-logo.webp"
            alt="PRO-LİG — Yayın ve İçerik Yönetim Platformu"
          />
        </div>
        <span>© {new Date().getFullYear()} Pro-Lig Platformu</span>
      </footer>
    </div>
  );
}
