import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const nextUrl = queryParams.get('next') || '/feed';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const user = await login(username, password);
      if (user.is_superuser && nextUrl === '/admin-dashboard') {
        navigate('/admin-dashboard');
      } else if (user.is_superuser && !queryParams.get('next')) {
        navigate('/admin-dashboard');
      } else {
        navigate(nextUrl);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid username or password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 70px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      background: 'var(--auth-bg)'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '440px',
        width: '100%',
        padding: '36px',
        borderRadius: 'var(--border-radius)',
        boxShadow: 'var(--glass-shadow)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Welcome Back
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Sign in to continue to SportsSphere
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(255, 75, 75, 0.1)',
            border: '1px solid rgba(255, 75, 75, 0.3)',
            color: '#ff4d4d',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '0.88rem',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>
              Username or Email
            </label>
            <input
              type="text"
              required
              placeholder="Enter your username or email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid var(--input-border)',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
                fontSize: '0.92rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                Password
              </label>
              <Link to="/password-reset" style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>
                Forgot Password?
              </Link>
            </div>
            <input
              type="password"
              required
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid var(--input-border)',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
                fontSize: '0.92rem',
                outline: 'none'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '12px',
              marginTop: '8px',
              fontSize: '0.95rem',
              fontWeight: '700'
            }}
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--input-border, rgba(255, 255, 255, 0.15))' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--input-border, rgba(255, 255, 255, 0.15))' }} />
        </div>

        <GoogleSignInButton
          onSuccess={(user) => {
            if (user.is_superuser && nextUrl === '/admin-dashboard') {
              navigate('/admin-dashboard');
            } else if (user.is_superuser && !queryParams.get('next')) {
              navigate('/admin-dashboard');
            } else {
              navigate(nextUrl);
            }
          }}
          onError={(errMsg) => setError(errMsg)}
        />

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent)', fontWeight: '700' }}>
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};
