import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AdminLoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const user = await login(username, password);
      if (user.is_superuser || user.is_staff) {
        navigate('/admin-dashboard');
      } else {
        setError('Access denied. Administrator privileges required.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid administrator credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#060e1a',
      color: '#f0f6fc',
      fontFamily: 'Outfit, sans-serif',
      padding: 'calc(20px + var(--safe-top)) calc(20px + var(--safe-right)) calc(20px + var(--safe-bottom)) calc(20px + var(--safe-left))'
    }}>
      <div style={{
        maxWidth: '440px',
        width: '100%',
        background: 'rgba(13, 27, 49, 0.85)',
        border: '1px solid rgba(0, 217, 255, 0.25)',
        borderRadius: '16px',
        padding: '36px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.6)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            Sports<span style={{ color: '#00d9ff' }}>Sphere</span>
            <span style={{ fontSize: '0.72rem', background: 'rgba(0, 217, 255, 0.15)', color: '#00d9ff', border: '1px solid rgba(0, 217, 255, 0.3)', padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
              Admin Control
            </span>
          </div>
          <p style={{ color: '#8b9bb4', fontSize: '0.88rem', marginTop: '8px' }}>
            Enter superuser credentials to access management dashboard
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(255, 75, 75, 0.15)',
            border: '1px solid rgba(255, 75, 75, 0.3)',
            color: '#ff5252',
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
            <label style={{ display: 'block', fontSize: '0.82rem', color: '#8b9bb4', marginBottom: '6px' }}>
              Superuser Username
            </label>
            <input
              type="text"
              required
              placeholder="e.g. teja"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="admin-search-input"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: '#8b9bb4', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              required
              placeholder="Superuser password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="admin-search-input"
              style={{ width: '100%' }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '12px',
              marginTop: '10px',
              background: '#00d9ff',
              color: '#081426',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '800',
              cursor: 'pointer',
              fontSize: '0.95rem'
            }}
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In to Admin Hub'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Link to="/" style={{ color: '#8b9bb4', textDecoration: 'none', fontSize: '0.85rem' }}>
            &larr; Return to Public Website
          </Link>
        </div>
      </div>
    </div>
  );
};
