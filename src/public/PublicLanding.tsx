import React from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  FileCheck2,
  GraduationCap,
  History,
  PenTool,
  ShieldCheck,
  Users,
  Workflow
} from 'lucide-react';

export function PublicLanding({ onLoginClick, onApplyClick }: { onLoginClick: () => void; onApplyClick: () => void }) {
  return (
    <div className="public-shell">
      <div className="public-ambient public-ambient-one" />
      <div className="public-ambient public-ambient-two" />

      <header className="public-header">
        <div className="public-header-inner">
          <a className="public-brand" href="#anasayfa" aria-label="PRO-LİG ana sayfa">
            <div className="public-brand-mark">P</div>
            <div>
              <strong>PRO-LİG</strong>
              <span>Yayın ve İçerik Yönetim Platformu</span>
            </div>
          </a>

          <nav className="public-nav" aria-label="Sayfa bölümleri">
            <a href="#anasayfa">Ana Sayfa</a>
            <a href="#nasil-calisir">Nasıl Çalışır</a>
            <a href="#yayinlar">Yayınlarımız</a>
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
        <section id="anasayfa" className="public-hero public-major-section">
          <div className="public-hero-copy">
            <div className="public-hero-eyebrow">
              <span /> YAYINCILIK İŞ AKIŞI PLATFORMU
            </div>
            <h1>
              Yayın üretim sürecini
              <span>tek merkezden yönetin.</span>
            </h1>
            <p>
              Yazar, editör, koordinatör, proje ve ödeme süreçlerini rol bazlı ve
              denetlenebilir bir iş akışında birleştirin.
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
              <div><Workflow size={15} /><span>Uçtan uca iş akışı</span></div>
              <div><History size={15} /><span>İzlenebilir süreç</span></div>
            </div>
          </div>

          <div className="public-hero-visual" aria-label="Pro-Lig ürün iş akışı önizlemesi">
            <div className="public-product-preview">
              <div className="public-product-preview-header">
                <div className="public-product-preview-brand">
                  <span className="public-product-preview-mark">P</span>
                  <div>
                    <small>PRO-LİG</small>
                    <strong>ÇALIŞMA AKIŞI</strong>
                  </div>
                </div>
                <span className="public-product-preview-live"><i /> Canlı Pilot Akış</span>
              </div>

              <div className="public-product-preview-body">
                <div className="public-product-preview-caption">
                  <div>
                    <span>YAYIN SÜRECİ</span>
                    <strong>İçerik üretim durumu</strong>
                  </div>
                  <small>3 aşama</small>
                </div>

                <ol className="public-product-preview-flow">
                  <li className="completed">
                    <div className="public-product-preview-icon"><FileCheck2 size={17} /></div>
                    <div className="public-product-preview-step">
                      <span>01 · Yazar</span>
                      <strong>Soru / içerik hazırlandı</strong>
                    </div>
                    <span className="public-product-status">Tamamlandı</span>
                  </li>
                  <li className="review">
                    <div className="public-product-preview-icon"><PenTool size={17} /></div>
                    <div className="public-product-preview-step">
                      <span>02 · Editör</span>
                      <strong>İçerik incelemeye alındı</strong>
                    </div>
                    <span className="public-product-status">İncelemede</span>
                  </li>
                  <li className="waiting">
                    <div className="public-product-preview-icon"><ShieldCheck size={17} /></div>
                    <div className="public-product-preview-step">
                      <span>03 · Koordinatör</span>
                      <strong>Yayın süreci kontrolü</strong>
                    </div>
                    <span className="public-product-status">Bekliyor</span>
                  </li>
                </ol>

                <div className="public-product-project">
                  <div className="public-product-project-icon"><BookOpen size={18} /></div>
                  <div className="public-product-project-copy">
                    <span>PİLOT PROJE</span>
                    <strong>8. Sınıf Matematik Pilot Soru Bankası</strong>
                    <small>PILOT-MAT-8-001</small>
                  </div>
                  <div className="public-product-project-meta">
                    <span>8. Sınıf</span>
                    <span>Matematik</span>
                    <span>Pilot</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="nasil-calisir" className="public-process-section public-major-section">
          <div className="public-section-heading">
            <span className="public-overline">SADE BİR İŞ AKIŞI</span>
            <h2>Üretimden onaya kadar herkes ne yapacağını bilir.</h2>
            <p>Her rol kendi kapsamındaki işi görür; süreç, kullanıcıyı gereksiz ayrıntıyla yormadan ilerler.</p>
          </div>

          <div className="public-process-grid">
            <article className="public-process-card">
              <div className="public-card-number">01</div>
              <div className="public-card-icon teal"><PenTool size={21} /></div>
              <h3>İçeriği hazırla</h3>
              <p>Yazarlar kendilerine tanımlanan branş ve proje kapsamındaki içerikleri oluşturur.</p>
            </article>
            <article className="public-process-card">
              <div className="public-card-number">02</div>
              <div className="public-card-icon amber"><ShieldCheck size={21} /></div>
              <h3>İncele ve geliştir</h3>
              <p>Editörler yalnız yetkili oldukları kapsamda içerikleri değerlendirir ve gerektiğinde revizyon ister.</p>
            </article>
            <article className="public-process-card">
              <div className="public-card-number">03</div>
              <div className="public-card-icon blue"><CheckCircle2 size={21} /></div>
              <h3>Süreci tamamla</h3>
              <p>Onaylanan çalışmalar proje ve hakediş akışına taşınır; işlem geçmişi izlenebilir kalır.</p>
            </article>
          </div>
        </section>

        <section id="yayinlar" className="public-publications-section public-major-section">
          <div className="public-section-heading">
            <span className="public-overline">YAYINLARIMIZ</span>
            <h2>Kitap Tanıtımları</h2>
            <p>Pro-Lig çalışma akışında hazırlanan ve yayın süreci doğrulanan projeleri inceleyin.</p>
          </div>

          <div className="public-publications-track" aria-label="Yayın tanıtımları">
            <article className="public-publication-card featured">
              <div className="public-publication-cover" aria-hidden="true">
                <BookOpen size={29} />
                <span>8</span>
                <small>MATEMATİK</small>
              </div>
              <div className="public-publication-content">
                <div className="public-publication-topline">
                  <span className="public-live-badge"><i /> Pilot</span>
                  <small>PILOT-MAT-8-001</small>
                </div>
                <h3>8. Sınıf Matematik Pilot Soru Bankası</h3>
                <div className="public-publication-meta">
                  <div><span>BRANŞ</span><strong>Matematik</strong></div>
                  <div><span>KADEME</span><strong>8. Sınıf</strong></div>
                  <div><span>DURUM</span><strong>Pilot</strong></div>
                </div>
              </div>
            </article>

            <article className="public-publication-card placeholder">
              <div className="public-placeholder-icon"><BookOpen size={24} /></div>
              <div>
                <span className="public-overline">YAYIN TAKVİMİ</span>
                <h3>Yeni yayınlar hazırlanıyor</h3>
                <p>Yeni yayın projeleri sisteme eklendikçe burada görüntülenecektir.</p>
              </div>
            </article>
          </div>
        </section>

        <section id="pilot" className="public-project-section public-major-section">
          <div className="public-pilot-summary">
            <div className="public-pilot-copy">
              <span className="public-overline">GÜNCEL PİLOT</span>
              <h2>Sistemde Yürütülen Pilot Çalışma</h2>
              <p>
                PILOT-MAT-8-001 kodlu 8. Sınıf Matematik Pilot Soru Bankası, gerçek iş akışını
                kontrollü biçimde doğrulamak için kullanılan pilot çalışmadır.
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
        <div className="public-brand footer-brand">
          <div className="public-brand-mark">P</div>
          <div><strong>PRO-LİG</strong><span>Pilot doğrulama sürümü</span></div>
        </div>
        <span>© {new Date().getFullYear()} Pro-Lig Platformu</span>
      </footer>
    </div>
  );
}
