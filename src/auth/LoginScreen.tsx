import React, { useState } from 'react';
import { LogIn, Loader2 } from 'lucide-react';

export interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
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
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError('E-posta veya Yifre hatal.');
        } else {
          setError('Sunucu hatas, lǬtfen daha sonra tekrar deneyin.');
        }
        setLoading(false);
        return;
      }

      // Success -> trigger re-verification
      onLoginSuccess();
    } catch (err) {
      setError('AY hatas, lǬtfen baYlantnz kontrol edin.');
      setLoading(false);
    }
  };

  return (
    <div className="login-screen-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f8fafc' }}>
      <div className="login-box" style={{ background: 'white', padding: '2.5rem', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', background: '#eef2ff', color: '#4f46e5', borderRadius: '12px', marginBottom: '1rem' }}>
            <LogIn size={24} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>PRO LG</h1>
          <p style={{ color: '#64748b', marginTop: '0.5rem', fontSize: '0.95rem' }}>Oturum An</p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label htmlFor="email" style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: '#334155', marginBottom: '0.5rem' }}>E-posta</label>
            <input 
              id="email"
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              required
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
            />
          </div>
          
          <div>
            <label htmlFor="password" style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: '#334155', marginBottom: '0.5rem' }}>Yifre</label>
            <input 
              id="password"
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              required
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || !email || !password}
            style={{ 
              background: '#4f46e5', color: 'white', border: 'none', padding: '0.875rem', 
              borderRadius: '8px', fontSize: '1rem', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem',
              opacity: (loading || !email || !password) ? 0.7 : 1
            }}
          >
            {loading ? <Loader2 className="spinner" size={18} /> : null}
            {loading ? 'GiriY yaplyor...' : 'GiriY Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}
