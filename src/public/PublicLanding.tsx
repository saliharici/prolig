import React from 'react';
import { BookOpen, Users, PenTool, CheckCircle2, ShieldCheck, ArrowRight, ArrowUpRight, GraduationCap } from 'lucide-react';

export function PublicLanding({ onLoginClick }: { onLoginClick: () => void }) {
  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Manrope, sans-serif' }}>
      <header style={{ background: 'white', padding: '1rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: '#1e293b', color: 'white', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', fontWeight: 800 }}>P</div>
          <strong style={{ fontSize: '1.25rem', color: '#0f172a', letterSpacing: '-0.02em' }}>PRO-LİG</strong>
        </div>
        <button className="primary-button" onClick={onLoginClick}>Giriş Yap <ArrowRight size={16} /></button>
      </header>

      <main>
        <section style={{ padding: '5rem 2rem', textAlign: 'center', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: 'white' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', padding: '0.25rem 0.75rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.5rem' }}>PİLOT SÜRÜM V1.0</span>
            <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1.5rem', lineHeight: 1.1 }}>Yeni Nesil Eğitim İçerik Yönetimi</h1>
            <p style={{ fontSize: '1.1rem', color: '#cbd5e1', marginBottom: '2.5rem', lineHeight: 1.6 }}>Pro-Lig, yayıncılık süreçlerini dijitalleştiren, yazarlar ile editörleri buluşturan ve projelerin hakediş döngüsüne kadar tüm aşamalarını yöneten bütünleşik bir içerik üretim platformudur.</p>
            <button className="primary-button" style={{ background: 'white', color: '#0f172a', padding: '1rem 2rem', fontSize: '1.1rem' }} onClick={onLoginClick}>
              Sisteme Giriş Yap <ArrowUpRight size={18} />
            </button>
          </div>
        </section>

        <section style={{ padding: '4rem 2rem', maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', color: '#1e293b', fontWeight: 800 }}>Süreç Nasıl İşler?</h2>
            <p style={{ color: '#64748b' }}>Yazarlıktan yayın sürecine uçtan uca içerik döngüsü.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            <div className="panel" style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{ background: '#eef2ff', color: '#4f46e5', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <PenTool size={28} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#0f172a' }}>1. Yazar Üretimi</h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.5 }}>Yazarlar kendilerine atanan proje bağlamında veya genel havuzda yeni sorular hazırlar.</p>
            </div>
            
            <div className="panel" style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{ background: '#fef3c7', color: '#d97706', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <ShieldCheck size={28} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#0f172a' }}>2. Editör İncelemesi</h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.5 }}>İncelemeye gönderilen sorular editörler tarafından değerlendirilir, onaylanır veya revizyon istenir.</p>
            </div>
            
            <div className="panel" style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{ background: '#dcfce7', color: '#16a34a', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <CheckCircle2 size={28} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#0f172a' }}>3. Yayın & Hakediş</h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.5 }}>Onaylanan sorular projelerde kullanılır ve muhasebe modülü ile yazar hakedişleri yönetilir.</p>
            </div>
          </div>
        </section>

        <section style={{ padding: '4rem 2rem', background: 'white', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', gap: '3rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 400px' }}>
              <h2 style={{ fontSize: '2rem', color: '#1e293b', fontWeight: 800, marginBottom: '1rem' }}>Öne Çıkan Projemiz</h2>
              <p style={{ color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.6 }}>Şu anda odaklandığımız yayın projesi hakkında temel bilgiler.</p>
              
              <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.5rem', borderRadius: '8px' }}><BookOpen size={24} /></div>
                  <div>
                    <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1.1rem' }}>8. Sınıf LGS Soru Bankası</h4>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>PILOT-MAT-8-001</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>KADEME</span>
                    <strong style={{ color: '#0f172a' }}><GraduationCap size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Ortaokul</strong>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>YAZAR KADROSU</span>
                    <strong style={{ color: '#0f172a' }}><Users size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Ülke Geneli</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <footer style={{ padding: '2rem', textAlign: 'center', borderTop: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.9rem' }}>
        &copy; {new Date().getFullYear()} Pro-Lig Platformu. Tüm hakları saklıdır. Pilot doğrulama sürümü.
      </footer>
    </div>
  );
}
