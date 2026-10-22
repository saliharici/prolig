import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Loader2, LockKeyhole, LogIn, Mail, ShieldCheck } from 'lucide-react';
import { login } from './api';
import './corporate-access-v1.css';

export interface LoginScreenProps {
  onLoginSuccess: () => void;
  onCancel: () => void;
}

export function LoginScreen({ onLoginSuccess, onCancel }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="soft-login-shell prolig-access-v1 publisher-theme">

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
            <span className="access-eyebrow">PRO-LİG / ÇALIŞMA ALANI</span>
            <h1>Yayın hazırlığı,<br /><em>ortak bir çalışma.</em></h1>
            <p>Yazarlık, editörlük ve yayın koordinasyonu. Size tanımlanan çalışma alanından sürecinize devam edin.</p>

            <div className="access-dossier" aria-label="Temsili yayın çalışma dosyası">
              <div className="access-dossier-head">
                <span>ÇALIŞMA DÜZENİ / ÖRNEK</span>
                <span className="access-dossier-seal">PRO-LİG</span>
              </div>
              <div className="access-dossier-body">
                <p className="access-dossier-caption">Bir yayın dosyasının yolculuğu</p>
                <div className="access-dossier-row"><span>01</span><strong>Yazarın taslağı</strong><small>İçerik üretimi</small></div>
                <div className="access-dossier-row"><span>02</span><strong>Editör incelemesi</strong><small>Geri bildirim ve revizyon</small></div>
                <div className="access-dossier-row"><span>03</span><strong>Yayın hazırlığı</strong><small>Onay ve teslim takibi</small></div>
              </div>
              <div className="access-dossier-foot">Bu görsel gerçek proje veya kullanıcı verisi içermez.</div>
            </div>
          </div>
        </aside>

        <section className="soft-login-card">
          <div className="access-form-heading">
            <span className="access-eyebrow">KİŞİSEL ÇALIŞMA ALANI</span>
            <span className="access-form-symbol" aria-hidden="true"><LogIn size={20} /></span>
          </div>
          <h2>Yeniden hoş geldiniz.</h2>
          <p className="soft-login-subtitle">Çalışma alanınıza erişmek için kurum hesabınızla giriş yapın.</p>

          {error && <div className="soft-login-error" role="alert">{error}</div>}

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
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete="current-password"
                  placeholder="Şifrenizi girin"
                />
                <button type="button" className="ux01-password-toggle" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'} aria-pressed={showPassword} disabled={loading}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
              </div>
            </label>

            <button type="submit" className="public-primary-button soft-login-submit" disabled={loading || !email || !password}>
              {loading ? <Loader2 className="spinner" size={17} /> : <LogIn size={17} />}
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="soft-login-footnote">Hesabınıza tanımlanan rol ve yetkilerle güvenli erişim.</div>
          <div className="ux01-access-trust"><ShieldCheck size={15}/> Mevcut güvenli oturum ve rol yetkileri korunur.</div>
        </section>
      </div>
    </div>
  );
}
