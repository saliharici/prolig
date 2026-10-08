import React from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  PenTool,
  ShieldCheck,
  Users
} from 'lucide-react';

export function PublicLanding({ onLoginClick, onApplyClick }: { onLoginClick: () => void; onApplyClick: () => void }) {
  return (
    <div className="public-shell">
      <div className="public-ambient public-ambient-one" />
      <div className="public-ambient public-ambient-two" />

      <header className="public-header">
        <div className="public-header-inner">
          <div className="public-brand" aria-label="PRO-LİG">
            <div className="public-brand-mark">P</div>
            <div>
              <strong>PRO-LİG</strong>
              <span>Yayın ve İçerik Yönetim Platformu</span>
            </div>
          </div>

          <div className="public-header-actions">
            <button className="public-ghost-button" onClick={onApplyClick}>Üyelik Başvurusu</button>
            <button className="public-primary-button compact" onClick={onLoginClick}>
              Giriş Yap <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="public-main">
        <section className="public-hero">
          <div className="public-hero-copy">
            <div className="public-pill"><span /> Pilot Sürüm · V1.0</div>
            <h1>İçerik üretimini daha sakin, düzenli ve izlenebilir yönetin.</h1>
            <p>
              Pro-Lig; yazar, editör ve koordinatörleri aynı çalışma akışında buluşturan,
              soru üretiminden editör incelemesine ve hakediş yönetimine kadar süreci
              tek merkezde görünür kılan bir yayın yönetim platformudur.
            </p>

            <div className="public-hero-actions">
              <button className="public-primary-button" onClick={onLoginClick}>
                Sisteme Giriş Yap <ArrowUpRight size={17} />
              </button>
              <button className="public-secondary-button" onClick={onApplyClick}>
                Üyelik Başvurusu
              </button>
            </div>

            <div className="public-trust-row">
              <div><CheckCircle2 size={15} /><span>Rol tabanlı erişim</span></div>
              <div><CheckCircle2 size={15} /><span>İzlenebilir içerik akışı</span></div>
              <div><CheckCircle2 size={15} /><span>Pilot doğrulama ortamı</span></div>
            </div>
          </div>

          <div className="public-hero-visual" aria-label="Pro-Lig çalışma akışı özeti">
            <div className="public-dashboard-card">
              <div className="public-dashboard-top">
                <div>
                  <span className="public-overline">ÇALIŞMA AKIŞI</span>
                  <h2>Yayın süreci tek ekranda</h2>
                </div>
                <span className="public-live-badge"><i /> Aktif</span>
              </div>

              <div className="public-flow-list">
                <div className="public-flow-item">
                  <div className="public-flow-icon teal"><PenTool size={18} /></div>
                  <div>
                    <strong>Yazar üretimi</strong>
                    <span>Soru ve içerik hazırlama</span>
                  </div>
                  <em>01</em>
                </div>
                <div className="public-flow-line" />
                <div className="public-flow-item">
                  <div className="public-flow-icon amber"><ShieldCheck size={18} /></div>
                  <div>
                    <strong>Editör incelemesi</strong>
                    <span>Kontrol, revizyon ve onay</span>
                  </div>
                  <em>02</em>
                </div>
                <div className="public-flow-line" />
                <div className="public-flow-item">
                  <div className="public-flow-icon blue"><CheckCircle2 size={18} /></div>
                  <div>
                    <strong>Yayın ve hakediş</strong>
                    <span>Tamamlanan işin izlenmesi</span>
                  </div>
                  <em>03</em>
                </div>
              </div>

              <div className="public-pilot-card">
                <div className="public-pilot-icon"><BookOpen size={19} /></div>
                <div>
                  <span className="public-overline">PİLOT PROJE</span>
                  <strong>8. Sınıf Matematik Pilot Soru Bankası</strong>
                  <small>PILOT-MAT-8-001</small>
                </div>
              </div>
            </div>

            <div className="public-floating-note">
              <div className="public-floating-icon"><Users size={17} /></div>
              <div>
                <strong>Pilot Yazar Ağı</strong>
                <span>Koordineli ve kapsam kontrollü</span>
              </div>
            </div>
          </div>
        </section>

        <section className="public-process-section">
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

        <section className="public-project-section">
          <div className="public-project-card">
            <div>
              <span className="public-overline">GÜNCEL PİLOT</span>
              <h2>8. Sınıf Matematik Pilot Soru Bankası</h2>
              <p>Gerçek iş akışını kontrollü biçimde doğrulamak için kullanılan pilot yayın projesi.</p>
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
