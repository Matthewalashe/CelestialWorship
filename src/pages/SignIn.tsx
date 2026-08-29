import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
// Using a generic placeholder for the logo import, assuming the actual file will be present
import logo from '../assets/logo.png';

export default function SignIn() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signInWithGoogle, signInWithEmail, signUpWithEmail, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/';

  useEffect(() => {
    if (user) {
      navigate(returnTo, { replace: true });
    }
  }, [user, navigate, returnTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, displayName);
        // Let the user effect redirect upon successful sign in/up
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      setAuthError(err.message || 'An error occurred during authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setAuthError(err.message || 'An error occurred with Google sign in.');
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      {/* Background gradients */}
      <div 
        className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at top right, var(--color-accent-brand), transparent 40%), radial-gradient(circle at bottom left, var(--color-accent-gold), transparent 40%)'
        }}
      />

      <div className="w-full max-w-md animate-slide-up z-10">
        <div 
          className="glass card p-8 sm:p-10 rounded-2xl shadow-2xl backdrop-blur-xl border"
          style={{ 
            backgroundColor: 'var(--color-bg-glass)', 
            borderColor: 'var(--color-border)' 
          }}
        >
          {/* Header */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-block mb-4 p-3 rounded-full" style={{ backgroundColor: 'rgba(255, 215, 0, 0.1)' }}>
              <img src={logo} alt="Logo" className="w-12 h-12" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            </div>
            <h1 
              className="text-3xl font-[Outfit] font-bold mb-2 tracking-tight"
              style={{ color: 'var(--color-text-primary)' }}
            >
              CelestialWorship
            </h1>
            <p 
              className="text-sm font-inter"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Celestial Worship Companion
            </p>
          </div>

          {authError && (
            <div 
              className="mb-6 p-3 rounded-lg text-sm border bg-red-500/10 border-red-500/20 text-red-400 text-center"
            >
              {authError}
            </div>
          )}

          {/* Social Sign In */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 hover:shadow-md active:scale-95"
            style={{ 
              backgroundColor: '#ffffff', 
              borderColor: 'var(--color-border)',
              color: '#1f2937'
            }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="font-medium font-inter">Continue with Google</span>
          </button>

          <div className="flex items-center my-6">
            <div className="flex-1 border-t" style={{ borderColor: 'var(--color-border)' }}></div>
            <span className="px-4 text-sm font-inter" style={{ color: 'var(--color-text-muted)' }}>or</span>
            <div className="flex-1 border-t" style={{ borderColor: 'var(--color-border)' }}></div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium mb-1 font-inter" style={{ color: 'var(--color-text-secondary)' }}>
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 transition-colors duration-200"
                  style={{
                    backgroundColor: 'var(--color-bg-card)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)'
                  }}
                  placeholder="John Doe"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1 font-inter" style={{ color: 'var(--color-text-secondary)' }}>
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 transition-colors duration-200"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)'
                }}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 font-inter" style={{ color: 'var(--color-text-secondary)' }}>
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 transition-colors duration-200"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)'
                }}
                placeholder="••••••••"
                minLength={6}
              />
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl font-medium font-inter text-white transition-all duration-200 hover:shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ 
                background: 'linear-gradient(135deg, var(--color-accent-brand) 0%, var(--color-accent-brand-light, #2dd4bf) 100%)',
                boxShadow: '0 4px 14px 0 rgba(13, 148, 136, 0.39)'
              }}
            >
              {isSubmitting ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          {/* Toggle and Links */}
          <div className="mt-6 text-center space-y-3 font-inter">
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setAuthError(null);
                }}
                className="font-medium hover:underline focus:outline-none transition-colors"
                style={{ color: 'var(--color-accent-brand)' }}
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
            <div>
              <Link 
                to="/" 
                className="text-sm hover:underline transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
              >
                &larr; Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
