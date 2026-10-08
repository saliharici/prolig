import React, { useState } from 'react';
import { LogIn, Loader2, ArrowLeft } from 'lucide-react';
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
    <div className="login-screen-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f8fafc' }}>
      <button onClick={onCancel} className="secondary-button" style={{ position: 'absolute', top: '2rem', left: '2rem' }}>
        <ArrowLeft size={18} /> Tanıtım sayfasına dön
      </button>
      <div className="login-box panel" style={{ padding: '2.5rem', width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', background: '#eef2ff', color: '#4f46e5', borderRadius: '12px', marginBottom: '1rem' }}>
            <LogIn size={24} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>PRO-LİG</h1>
          <p style={{ color: '#64748b', marginTop: '0.5rem', fontSize: '0.95rem' }}>Oturum Aç</p>
        </div>

        {error && (
          <div className="error-state" style={{ padding: '0.75rem', marginBottom: '1.5rem', textAlign: 'left', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label htmlFor="email" className="question-editor-label" style={{ marginBottom: '0.5rem', display: 'block' }}>E-posta</label>
            <input 
              id="email"
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              required
              className="text-input"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>
          
          <div>
            <label htmlFor="password" className="question-editor-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Şifre</label>
            <input 
              id="password"
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              required
              className="text-input"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <button 
            type="submit" 
            className="primary-button"
            disabled={loading || !email || !password}
            style={{ 
              width: '100%',
              padding: '0.875rem', 
              fontSize: '1rem',
              justifyContent: 'center',
              marginTop: '0.5rem'
            }}
          >
            {loading ? <Loader2 className="spinner" size={18} /> : null}
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}
