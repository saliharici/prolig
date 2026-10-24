import React, { useEffect, useState } from 'react';
import { ArrowLeft, Mail, ShieldCheck, LockKeyhole } from 'lucide-react';
import './corporate-access-v1.css';
import './publisher-access-ux02.css';

interface Props { onBack: () => void; }

export function PasswordRecoveryScreen({ onBack }: Props) {
  const [token] = useState(() => {
    if (typeof window === 'undefined') return '';
    const match = /^#ux03-reset=([0-9a-f]{64})$/i.exec(window.location.hash);
    return match?.[1] || '';
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fragment is not sent to servers, and is removed from address bar promptly.
    if (window.location.hash.startsWith('#ux03-reset=')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setMessage('');
    setFailure('');
    if (token && (password !== confirm || password.length < 14 || password.length > 128 ||
      !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password))) {
      setFailure('Şifre en az 14 karakter olmalı; büyük/küçük harf ve rakam içermeli, tekrar alanıyla eşleşmelidir.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(token ? '/api/v1/auth/password-reset-complete' : '/api/v1/auth/password-reset-request', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: token ? JSON.stringify({ token, password }) : JSON.stringify({ email })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Hesap kurtarma hizmeti kullanılamıyor.');
      setPassword('');
      setConfirm('');
      setMessage(body.message || 'İşlem alındı.');
    } catch (error) {
      setFailure(error instanceof Error ? error.message : 'Güvenli bağlantı kurulamadı.');
    } finally {
      setLoading(false);
    }
  };

  return <div className="soft-login-shell prolig-access-v1 publisher-theme ux02-login-shell">
    <a className="ux02-login-skip" href="#ux03-recovery-form">Forma geç</a>
    <header className="ux02-login-header">
      <a className="ux02-login-logo" href="/" onClick={e => { e.preventDefault(); onBack(); }} aria-label="PRO-LİG ana sayfa">
        <img src="/brand/prolig-logo-primary.png" alt="PRO-LİG"/><span>YAYINEVİ</span>
      </a>
      <button type="button" className="ux02-login-back" onClick={onBack}><ArrowLeft size={17}/> Girişe dön</button>
    </header>
    <main className="ux02-login-main">
      <aside className="ux02-login-intro">
        <span className="ux02-login-overline">PRO-LİG / HESAP GÜVENLİĞİ</span>
        <h1>Hesabınıza <em>güvenle erişin.</em></h1>
        <p>Güvenli bir e-posta doğrulaması olmadan şifre değiştirilmez. Pasif hesaplar bu ekranla etkinleştirilemez.</p>
        <div className="ux02-login-intro-footer"><span>PRO-LİG YAYINEVİ</span><span>Güvenli erişim</span></div>
      </aside>
      <section className="ux02-login-panel" id="ux03-recovery-form" tabIndex={-1} aria-labelledby="ux03-recovery-title">
        <div className="ux02-login-panel-head">
          <div><span className="ux02-login-kicker">KURUM HESABI</span>
            <h2 id="ux03-recovery-title">{token ? 'Yeni şifre belirle' : 'Şifremi unuttum'}</h2></div>
          <span className="ux02-login-emblem"><ShieldCheck size={23}/></span>
        </div>
        <p className="ux02-login-subtitle">
          {token ? 'Doğrulama bağlantınız için güçlü ve yeni bir şifre belirleyin.' :
            'E-posta adresinizi girin. Hesap uygunsa güvenli doğrulama bağlantısı gönderilecektir.'}
        </p>
        {failure && <div role="alert" className="ux02-login-error">{failure}</div>}
        {message && <div role="status" className="ux03-recovery-notice">{message}</div>}
        {!message && <form className="ux02-login-form" onSubmit={submit}>
          {!token ? <div className="ux02-login-field">
            <label htmlFor="ux03-email">E-posta adresi</label>
            <div className="ux02-login-input-wrap"><Mail size={18}/>
              <input id="ux03-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} disabled={loading}/>
            </div>
          </div> : <>
            <div className="ux02-login-field"><label htmlFor="ux03-password">Yeni şifre</label>
              <div className="ux02-login-input-wrap"><LockKeyhole size={18}/>
                <input id="ux03-password" type="password" autoComplete="new-password" required minLength={14} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} disabled={loading}/>
              </div>
            </div>
            <div className="ux02-login-field"><label htmlFor="ux03-confirm">Yeni şifre (tekrar)</label>
              <div className="ux02-login-input-wrap"><LockKeyhole size={18}/>
                <input id="ux03-confirm" type="password" autoComplete="new-password" required minLength={14} value={confirm} onChange={e => setConfirm(e.target.value)} disabled={loading}/>
              </div>
            </div>
          </>}
          <button type="submit" className="ux02-login-submit" disabled={loading || (!token && !email) || (Boolean(token) && (!password || !confirm))}>
            {loading ? 'Doğrulanıyor...' : token ? 'Şifreyi yenile' : 'Doğrulama bağlantısı iste'}
          </button>
        </form>}
        <div className="ux02-login-trust"><ShieldCheck size={17}/><span>İşlem sonucu hesabın varlığını veya statüsünü açıklamaz.</span></div>
      </section>
    </main>
    <footer className="ux02-login-footer"><span>© {new Date().getFullYear()} PRO-LİG Yayınevi</span><span>Kurumsal çalışan erişimi</span></footer>
  </div>;
}
