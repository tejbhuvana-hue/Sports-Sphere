import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

export const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: 'PLAYER',
    password: '',
    confirm_password: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const roles = [
    { value: 'PLAYER', label: 'Player' },
    { value: 'COACH', label: 'Coach' },
    { value: 'CLUB', label: 'Club' },
    { value: 'ASSOCIATION', label: 'Association' },
    { value: 'SPONSOR', label: 'Sponsor' },
    { value: 'SCOUT', label: 'Scout' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        username: formData.username.trim(),
        email: formData.email.trim(),
        role: formData.role,
        password: formData.password,
      });
      navigate('/feed');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please check your inputs.');
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
        maxWidth: '480px',
        width: '100%',
        padding: '36px',
        borderRadius: 'var(--border-radius)',
        boxShadow: 'var(--glass-shadow)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Create an Account
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Join the SportsSphere ecosystem
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>
              Username
            </label>
            <input
              type="text"
              required
              placeholder="Choose a username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
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
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="Enter your email address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
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
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>
              Select Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--input-border)',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
                fontSize: '0.92rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {roles.map((r) => (
                <option key={r.value} value={r.value} style={{ background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>
              Password
            </label>
            <input
              type="password"
              required
              placeholder="Create a strong password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
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
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>
              Confirm Password
            </label>
            <input
              type="password"
              required
              placeholder="Confirm your password"
              value={formData.confirm_password}
              onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
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
              marginTop: '10px',
              fontSize: '0.95rem',
              fontWeight: '700'
            }}
          >
            {isSubmitting ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--input-border, rgba(255, 255, 255, 0.15))' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--input-border, rgba(255, 255, 255, 0.15))' }} />
        </div>

        <GoogleSignInButton
          role={formData.role}
          text={`Sign up with Google as ${roles.find(r => r.value === formData.role)?.label || 'Player'}`}
          onSuccess={() => navigate('/feed')}
          onError={(errMsg) => setError(errMsg)}
        />

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: '700' }}>
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
};
