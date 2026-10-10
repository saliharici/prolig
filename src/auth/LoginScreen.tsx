import React, { useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, FileQuestion, ListChecks, Loader2, LockKeyhole, LogIn, Mail, MessageSquareText } from 'lucide-react';
import { login } from './api';

export interface LoginScreenProps {
  onLoginSuccess: () => void;
  onCancel: () => void;
}

export function LoginScreen({ onLoginSuccess, onCancel }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      onLoginSuccess();
    } catch (err: any) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        setError('Ağ hatası, lütfen bağlantınızı kontrol edin.');
      } else {
        setError(err.message || 'Sunucu hatası, lütfen daha sonra tekrar deneyin.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="soft-login-shell">
      <div className="public-ambient public-ambient-one" />
      <div className="public-ambient public-ambient-two" />

      <button onClick={onCancel} className="soft-login-back">
        <ArrowLeft size={16} /> Ana sayfaya dön
      </button>

      <div className="soft-login-layout">
        <aside className="soft-login-intro">
          <div className="public-brand soft-login-brand">
            <img
              className="soft-login-brand-logo"
              src="/brand/prolig-logo-primary.png"
              alt="PRO-LİG — Yayın ve İçerik Yönetim Platformu"
            />
          </div>
          <div className="soft-login-copy">
            <span className="public-overline">GÜVENLİ ÇALIŞMA ALANI</span>
            <h1>İşinize kaldığınız yerden devam edin.</h1>
            <p>Rolünüz ve yetki kapsamınız doğrultusunda size ait proje, içerik ve değerlendirme ekranlarına erişin.</p>
            <div className="soft-login-capabilities" aria-label="PRO-LİG platform yetenekleri">
              <div className="soft-login-capability">
                <span><BookOpen size={16} /></span>
                <div><strong>Proje Yönetimi</strong><small>Kapsam, ekip ve ilerleme</small></div>
              </div>
              <div className="soft-login-capability">
                <span><ListChecks size={16} /></span>
                <div><strong>Görev Takibi</strong><small>Sorumlu, termin ve durum</small></div>
              </div>
              <div className="soft-login-capability">
                <span><FileQuestion size={16} /></span>
                <div><strong>İçerik Üretimi</strong><small>Soru, inceleme ve revizyon</small></div>
              </div>
              <div className="soft-login-capability">
                <span><MessageSquareText size={16} /></span>
                <div><strong>Ekip İletişimi</strong><small>Kurumsal mesaj ve duyuru</small></div>
              </div>
            </div>

            <div className="soft-login-flow" aria-label="PRO-LİG yayın üretim akışı">
              <span>PROJE</span><i />
              <span>GÖREV</span><i />
              <span>ÜRETİM</span><i />
              <span>KONTROL</span><i />
              <span>YAYIN</span>
            </div>

            <div className="soft-login-points">
              <div><CheckCircle2 size={15} /><span>Rol tabanlı erişim</span></div>
              <div><CheckCircle2 size={15} /><span>Güvenli oturum</span></div>
              <div><CheckCircle2 size={15} /><span>İzlenebilir işlem geçmişi</span></div>
            </div>
          </div>
        </aside>

        <section className="soft-login-card">
          <div className="soft-login-card-icon"><LogIn size={22} /></div>
          <span className="public-overline">PRO-LİG HESABI</span>
          <h2>Oturum açın</h2>
          <p className="soft-login-subtitle">Çalışma alanınıza erişmek için kurum hesabınızla giriş yapın.</p>

          {error && <div className="soft-login-error">{error}</div>}

          <form onSubmit={handleSubmit} className="soft-login-form">
            <label htmlFor="email">
              E-posta
              <div className="soft-input-wrap">
                <Mail size={17} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete="email"
                  placeholder="ornek@prolig.local"
                />
              </div>
            </label>

            <label htmlFor="password">
              Şifre
              <div className="soft-input-wrap">
                <LockKeyhole size={17} />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete="current-password"
                  placeholder="Şifrenizi girin"
                />
              </div>
            </label>

            <button type="submit" className="public-primary-button soft-login-submit" disabled={loading || !email || !password}>
              {loading ? <Loader2 className="spinner" size={17} /> : <LogIn size={17} />}
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="soft-login-footnote">
            Pilot ortamı · Yetkisiz erişim ve işlemler kayıt altına alınır.
          </div>
        </section>
      </div>
    </div>
  );
}
