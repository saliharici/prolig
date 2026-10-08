import React, { useEffect, useState } from 'react';
import { AuthState } from './types';
import { fetchMe, logout } from './api';
import { LoginScreen } from './LoginScreen';
import { Loader2, AlertCircle } from 'lucide-react';
import DemoApp from '../DemoApp';
import { PublicLanding } from '../public/PublicLanding';

export function AuthGate() {
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });
  const [showLogin, setShowLogin] = useState(false);

  const checkSession = async () => {
    setAuthState({ status: 'loading' });
    try {
      const user = await fetchMe();
      if (user) {
        setAuthState({ status: 'authenticated', user });
      } else {
        setAuthState({ status: 'unauthenticated' });
      }
    } catch (err: any) {
      setAuthState({ status: 'error', message: err.message || 'Sisteme bağlanırken bir hata oluştu.' });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setAuthState({ status: 'unauthenticated' });
      setShowLogin(false);
    } catch (err: any) {
      alert('Çıkış işlemi başarısız oldu, lütfen tekrar deneyin.');
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  if (authState.status === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc', color: '#4f46e5' }}>
        <Loader2 className="spinner" size={40} style={{ marginBottom: '1rem' }} />
        <h2 style={{ fontSize: '1.25rem', color: '#1e293b', fontWeight: 500 }}>PRO-LİG yükleniyor...</h2>
      </div>
    );
  }

  if (authState.status === 'error') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc' }}>
        <div style={{ background: 'white', padding: '2.5rem', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: '400px' }}>
          <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '0.5rem' }}>Bağlantı Hatası</h2>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>{authState.message}</p>
          <button 
            onClick={checkSession}
            style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  if (authState.status === 'unauthenticated') {
    if (showLogin) {
      return <LoginScreen onLoginSuccess={() => { setShowLogin(false); checkSession(); }} onCancel={() => setShowLogin(false)} />;
    } else {
      return <PublicLanding onLoginClick={() => setShowLogin(true)} />;
    }
  }

  // Authenticated
  return <DemoApp currentUser={authState.user} onLogoutRequest={handleLogout} />;
}
