import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { login } from './api';
import './corporate-access-v1.css';
import './publisher-access-ux02.css';

export interface LoginScreenProps {
  onLoginSuccess: () => void;
  onCancel: () => void;
  onForgotPassword?: () => void;
}

/** UX-02 visual-only surface; the existing login() endpoint and server RBAC are unchanged. */
export function LoginScreen({ onLoginSuccess, onCancel, onForgotPassword }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      onLoginSuccess();
    } catch (err: unknown) {
      const failure = err instanceof Error ? err : new Error('Giriş işlemi tamamlanamadı.');
      if (failure.message === 'Failed to fetch' || failure.name === 'TypeError') {
        setError('Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip yeniden deneyin.');
      } else {
        setError(failure.message || 'Giriş işlemi tamamlanamadı. Lütfen yeniden deneyin.');
      }
    } finally {
      setLoading(false);
    }
  };

  return <div className="soft-login-shell prolig-access-v1 publisher-theme ux02-login-shell">
    <a className="ux02-login-skip" href="#ux02-login-form">Giriş formuna geç</a>
    <header className="ux02-login-header">
      <a className="ux02-login-logo" href="/" onClick={(event) => { event.preventDefault(); onCancel(); }} aria-label="PRO-LİG ana sayfa">
        <img src="/brand/prolig-logo-primary.png" alt="PRO-LİG"/><span>YAYINEVİ</span>
      </a>
      <button type="button" onClick={onCancel} className="ux02-login-back"><ArrowLeft size={17} aria-hidden="true"/> Ana sayfaya dön</button>
    </header>
    <main className="ux02-login-main">
      <aside className="ux02-login-intro">
        <span className="ux02-login-overline">PRO-LİG / ÇALIŞAN GİRİŞİ</span>
        <h1>Yayın sürecine <em>kaldığınız yerden devam edin.</em></h1>
        <p>Yazar, editör ve yayın ekibine ayrılmış çalışma alanına kurum hesabınızla erişin.</p>
        <div className="ux02-login-intro-footer"><span>PRO-LİG YAYINEVİ</span><span>Güvenli çalışma alanı</span></div>
      </aside>
      <section className="ux02-login-panel" id="ux02-login-form" aria-labelledby="ux02-login-title" tabIndex={-1}>
        <div className="ux02-login-panel-head">
          <div><span className="ux02-login-kicker">KURUM HESABI</span><h2 id="ux02-login-title">Çalışan Girişi</h2></div>
          <span className="ux02-login-emblem" aria-hidden="true"><ShieldCheck size={23}/></span>
        </div>
        <p className="ux02-login-subtitle">Size tanımlanmış e-posta adresi ve şifrenizle giriş yapın.</p>
        {error && <div className="ux02-login-error" role="alert">{error}</div>}
        <form onSubmit={handleSubmit} className="ux02-login-form">
          <div className="ux02-login-field">
            <label htmlFor="email">E-posta adresi</label>
            <div className="ux02-login-input-wrap">
              <Mail size={18} aria-hidden="true"/>
              <input id="email" name="email" type="email" value={email} onChange={event => setEmail(event.target.value)}
                autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false}
                placeholder="E-posta adresiniz" disabled={loading} required/>
            </div>
          </div>
          <div className="ux02-login-field">
            <label htmlFor="password">Şifre</label>
            <div className="ux02-login-input-wrap">
              <LockKeyhole size={18} aria-hidden="true"/>
              <input id="password" name="password" type={showPassword ? 'text' : 'password'} value={password}
                onChange={event => setPassword(event.target.value)} autoComplete="current-password"
                placeholder="Şifreniz" disabled={loading} required/>
              <button type="button" className="ux02-password-toggle" aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                aria-pressed={showPassword} onClick={() => setShowPassword(current => !current)} disabled={loading}>
                {showPassword ? <EyeOff size={19} aria-hidden="true"/> : <Eye size={19} aria-hidden="true"/>}
              </button>
            </div>
          </div>
          <button type="submit" className="ux02-login-submit" disabled={loading || !email || !password}>
            {loading ? <Loader2 className="ux02-spin" size={17} aria-hidden="true"/> : <span>Giriş Yap</span>}
            {loading ? 'Giriş yapılıyor...' : <ArrowRight size={18} aria-hidden="true"/>}
          </button>
        </form>
        {onForgotPassword && <button type="button" className="ux03-forgot-link" onClick={onForgotPassword}>Şifremi unuttum</button>}
        <div className="ux02-login-trust"><ShieldCheck size={17} aria-hidden="true"/><span>Yetkileriniz yalnızca doğrulanmış oturumunuza göre belirlenir.</span></div>
      </section>
    </main>
    <footer className="ux02-login-footer"><span>© {new Date().getFullYear()} PRO-LİG Yayınevi</span><span>Kurumsal çalışan erişimi</span></footer>
  </div>;
}
