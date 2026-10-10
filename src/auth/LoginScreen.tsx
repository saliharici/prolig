import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, LockKeyhole, LogIn, Mail } from 'lucide-react';
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
            <div className="soft-login-points">
              <div><CheckCircle2 size={16} /><span>Rol tabanlı erişim</span></div>
              <div><CheckCircle2 size={16} /><span>Güvenli oturum yönetimi</span></div>
              <div><CheckCircle2 size={16} /><span>İzlenebilir işlem geçmişi</span></div>
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
