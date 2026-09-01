import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { profilesAPI } from '../services/api';
import { SunIcon, MoonIcon, CheckVerifiedIcon, ChevronRightIcon } from '../components/common/Icons';

export const SettingsPage = () => {
  const { user, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [togglingVerify, setTogglingVerify] = useState(false);
  const [message, setMessage] = useState('');

  const handleToggleVerification = async () => {
    setTogglingVerify(true);
    setMessage('');
    try {
      const res = await profilesAPI.toggleVerification();
      await refreshUser();
      setMessage(res.data.message);
    } catch (err) {
      console.error('Toggle verify error', err);
    } finally {
      setTogglingVerify(false);
    }
  };

  return (
    <div className="settings-container" style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '30px', borderRadius: 'var(--border-radius)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '24px' }}>
          Account Settings & Preferences
        </h2>

        {message && (
          <div style={{ background: 'rgba(0, 230, 118, 0.1)', color: '#00e676', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.88rem' }}>
            {message}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Account Details Box */}
          <div style={{ padding: '16px', background: 'var(--bg-subtle-2)', borderRadius: '10px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '10px' }}>Account Information</h3>
            <div style={{ fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div><strong>Username:</strong> @{user?.username}</div>
              <div><strong>Email:</strong> {user?.email}</div>
              <div><strong>Account Role:</strong> <span style={{ color: 'var(--accent)', fontWeight: '700' }}>{user?.role}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <strong>Verified Status:</strong>
                {user?.is_verified ? (
                  <span style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckVerifiedIcon size={16} /> Verified Active
                  </span>
                ) : (
                  'Standard Account'
                )}
              </div>
            </div>
            <div style={{ marginTop: '12px' }}>
              <Link to="/profile/edit" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                Edit Profile Details & Bio <ChevronRightIcon size={14} />
              </Link>
            </div>
          </div>

          {/* Verification Badge Toggle */}
          <div style={{ padding: '16px', background: 'var(--bg-subtle-2)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h4 style={{ fontWeight: '700', fontSize: '0.95rem' }}>Profile Verification Badge</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Toggle verified checkmark simulation on your public athlete profile.
              </p>
            </div>
            <button
              onClick={handleToggleVerification}
              disabled={togglingVerify}
              className={`btn ${user?.is_verified ? 'btn-secondary' : 'btn-primary'} btn-sm`}
            >
              {user?.is_verified ? 'Remove Badge' : 'Get Verified'}
            </button>
          </div>

          {/* Theme Preference Toggle */}
          <div style={{ padding: '16px', background: 'var(--bg-subtle-2)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h4 style={{ fontWeight: '700', fontSize: '0.95rem' }}>Theme Mode</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Current theme: <strong style={{ textTransform: 'capitalize' }}>{theme}</strong>
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {theme === 'light' ? (
                <>
                  <MoonIcon size={16} /> Switch to Dark
                </>
              ) : (
                <>
                  <SunIcon size={16} /> Switch to Light
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
