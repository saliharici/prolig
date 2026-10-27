import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { login } from './api';
import './corporate-access-v1.css';
import './publisher-access-ux02.css';

export interface LoginScreenProps {
  onLoginSuccess: () => void;
  onCancel: () => void;
}

/** UX-02 visual-only surface; the existing login() endpoint and server RBAC are unchanged. */
export function LoginScreen({ onLoginSuccess, onCancel }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Only built for the dedicated, Vercel-protected PRO-LIG TEST Preview branch.
  const testAdminAvailable = import.meta.env.VITE_TEST_ADMIN_SETUP === 'true'
    && window.location.hostname.endsWith('.vercel.app');
  const [showTestSetup, setShowTestSetup] = useState(false);
  const [testPassword, setTestPassword] = useState('');
  const [testPasswordAgain, setTestPasswordAgain] = useState('');
  const [testSetupLoading, setTestSetupLoading] = useState(false);

  const setupTestAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (testPassword.length < 10 || testPassword !== testPasswordAgain) {
      setError('TEST şifresi en az 10 karakter olmalı ve iki giriş aynı olmalı.');
      return;
    }
    setTestSetupLoading(true);
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testAdminSetup: true, password: testPassword })
      });
      if (response.status === 409) {
        setShowTestSetup(false);
        setEmail('preview-admin@prolig.invalid');
        setError('TEST yönetici hesabı zaten oluşturulmuş. Normal giriş bölümünden şifrenizi kullanın.');
        return;
      }
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(typeof body.error === 'string' ? body.error : 'TEST yöneticisi oluşturulamadı.');
      }
      setTestPassword('');
      setTestPasswordAgain('');
      onLoginSuccess();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'TEST yönetici hesabı oluşturulamadı.');
    } finally {
      setTestSetupLoading(false);
    }
  };

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
        {testAdminAvailable && <div style={{ marginTop: 18, padding: 14, background: '#eff8f5', border: '1px solid #cde6df', borderRadius: 12 }}>
          <strong style={{ display: 'block', fontSize: 13, marginBottom: 8, color: '#215f54' }}>Ayrı TEST Yönetici Girişi</strong>
          <p style={{ fontSize: 12, lineHeight: 1.6, margin: '0 0 10px', color: '#4e756e' }}>
            Canlı hesabınız etkilenmez. İlk kullanımda kendi TEST şifrenizi burada belirleyin;
            sonraki girişlerde <strong>preview-admin@prolig.invalid</strong> hesabını kullanın.
          </p>
          <button type="button" className="ux02-login-back" onClick={() => { setShowTestSetup(value => !value); setError(null); }}
            style={{ marginBottom: showTestSetup ? 12 : 0 }}>
            {showTestSetup ? 'TEST hesabı oluşturmayı kapat' : 'İlk TEST yönetici hesabımı oluştur'}
          </button>
          {showTestSetup && <form onSubmit={setupTestAdmin} style={{ display: 'grid', gap: 9 }}>
            <label htmlFor="test-admin-pass" style={{ fontSize: 12 }}>Yeni TEST şifreniz</label>
            <input id="test-admin-pass" type="password" minLength={10} required autoComplete="new-password"
              value={testPassword} onChange={event => setTestPassword(event.target.value)}
              style={{ padding: 11, borderRadius: 8, border: '1px solid #c1d9d4' }}/>
            <label htmlFor="test-admin-confirm" style={{ fontSize: 12 }}>TEST şifrenizi tekrar yazın</label>
            <input id="test-admin-confirm" type="password" minLength={10} required autoComplete="new-password"
              value={testPasswordAgain} onChange={event => setTestPasswordAgain(event.target.value)}
              style={{ padding: 11, borderRadius: 8, border: '1px solid #c1d9d4' }}/>
            <button type="submit" className="ux02-login-submit" disabled={testSetupLoading}>
              {testSetupLoading ? 'TEST hesabı oluşturuluyor…' : 'TEST hesabını oluştur ve giriş yap'}
            </button>
          </form>}
        </div>}
        <div className="ux02-login-trust"><ShieldCheck size={17} aria-hidden="true"/><span>Yetkileriniz yalnızca doğrulanmış oturumunuza göre belirlenir.</span></div>
      </section>
    </main>
    <footer className="ux02-login-footer"><span>© {new Date().getFullYear()} PRO-LİG Yayınevi</span><span>Kurumsal çalışan erişimi</span></footer>
  </div>;
}
