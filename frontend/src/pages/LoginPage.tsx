import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Sparkles, ShieldCheck, Database, Zap } from 'lucide-react';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

export default function LoginPage() {
  const { user, signInWithGoogle, loading, signInMock } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  if (user && !loading) {
    return <Navigate to="/" replace />;
  }

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please check your Firebase configuration or network.');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="login-page-container">
      {/* Absolute theme toggle wrapper */}
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 100 }}>
        <ThemeSwitcher />
      </div>

      {/* Dynamic Background Accents */}
      <div className="login-glow-1"></div>
      <div className="login-glow-2"></div>
      <div className="login-glow-3"></div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '800px', padding: '2rem', zIndex: 10, textAlign: 'center' }}>
        
        {/* Brand/Hero Section */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <div className="login-logo-box" style={{ width: '64px', height: '64px', borderRadius: '1.25rem' }}>
              <Sparkles size={32} className="logo-sparkle" />
            </div>
          </div>
          <h1 className="login-app-title" style={{ fontSize: '2.5rem', marginBottom: '0.75rem', fontFamily: 'var(--font-display)', letterSpacing: '-0.03em', background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            DocuMind AI
          </h1>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>
            Your Personal AI Research Assistant
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto', lineHeight: '1.5' }}>
            Upload complex PDF documents, extract deep semantic insights, and conduct chat research inside secure, isolated environments.
          </p>
        </div>

        {/* Feature Badges Row */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
          <div className="kb-pill-btn" style={{ cursor: 'default', background: 'rgba(99, 102, 241, 0.08)', borderColor: 'rgba(99, 102, 241, 0.2)', padding: '0.5rem 1rem' }}>
            <Database size={14} className="feature-icon" style={{ color: 'var(--primary-color)' }} />
            <span>Isolated Workspaces</span>
          </div>
          <div className="kb-pill-btn" style={{ cursor: 'default', background: 'rgba(139, 92, 246, 0.08)', borderColor: 'rgba(139, 92, 246, 0.2)', padding: '0.5rem 1rem' }}>
            <ShieldCheck size={14} className="feature-icon" style={{ color: 'var(--accent-color)' }} />
            <span>Secure PDF Storage</span>
          </div>
          <div className="kb-pill-btn" style={{ cursor: 'default', background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.2)', padding: '0.5rem 1rem' }}>
            <Zap size={14} className="feature-icon" style={{ color: 'var(--success-color)' }} />
            <span>Semantic Vector Search</span>
          </div>
        </div>

        <div className="login-card" style={{ width: '100%', maxWidth: '440px', margin: 0 }}>
          <div className="login-auth-section" style={{ width: '100%' }}>
            <p className="login-prompt-text" style={{ marginBottom: '1.25rem', fontSize: '0.95rem' }}>Get Started with DocuMind AI</p>
            
            {error && (
              <div className="login-error-box" style={{ width: '100%', marginBottom: '1.25rem' }}>
                <p className="login-error-text">{error}</p>
              </div>
            )}

            <button 
              type="button"
              onClick={handleGoogleSignIn} 
              disabled={isSigningIn}
              className="google-signin-btn"
              id="google-signin-btn"
              style={{ width: '100%', padding: '0.85rem 1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px var(--shadow-color)' }}
            >
              <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18" style={{ marginRight: '0.5rem' }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{isSigningIn ? 'Signing in...' : 'Sign in with Google'}</span>
            </button>
          </div>
        </div>

        {/* Trust row */}
        <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'center', gap: '2rem', fontSize: '0.725rem', color: 'var(--text-secondary)', opacity: 0.8, fontWeight: 500 }}>
          <span>🔒 256-bit Encrypted</span>
          <span>•</span>
          <span>🔑 Google OAuth 2.0</span>
          <span>•</span>
          <span>📂 Isolated Database</span>
        </div>
      </div>
    </div>
  );
}
