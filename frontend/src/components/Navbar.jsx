import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getMediaUrl } from '../services/api';
import { SunIcon, MoonIcon, PlusIcon, MessagesIcon, BellIcon, SearchIcon, MoreIcon, CheckVerifiedIcon } from './common/Icons';

export const Navbar = ({ onToggleSidebar }) => {
  const { user, unreadNotifications } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const avatarUrl = user?.profile?.profile_picture ? getMediaUrl(user.profile.profile_picture) : null;

  return (
    <header className="top-navbar">
      <div className="nav-brand">
        <button
          className="hamburger"
          id="hamburger-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle Navigation Sidebar"
          style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <MoreIcon size={22} />
        </button>
        <Link to="/home" className="nav-brand-logo">
          Sports<span className="brand-accent">Sphere</span>
        </Link>
      </div>

      <form onSubmit={handleSearchSubmit} className="nav-search">
        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', display: 'flex' }}>
          <SearchIcon size={18} />
        </span>
        <input
          type="text"
          placeholder="Search athletes, coaches, sponsors, or sports..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 16px 10px 42px',
            borderRadius: '24px',
            border: '1px solid var(--input-border)',
            background: 'var(--input-bg)',
            color: 'var(--text-primary)',
            outline: 'none',
            fontSize: '0.9rem'
          }}
        />
      </form>

      <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          aria-label="Toggle Theme"
          style={{
            background: 'var(--nav-item-bg)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-primary)'
          }}
        >
          {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
        </button>

        <Link
          to="/feed"
          className="nav-icon-btn"
          title="Create Post"
          style={{
            background: 'var(--accent)',
            color: '#ffffff',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none'
          }}
        >
          <PlusIcon size={20} color="#ffffff" strokeWidth={2.6} />
        </Link>
        <Link to="/messages" className="nav-icon-btn" title="Messages">
          <MessagesIcon size={20} />
        </Link>
        <Link to="/notifications" className="nav-icon-btn" title="Notifications" style={{ position: 'relative' }}>
          <BellIcon size={20} />
          {unreadNotifications > 0 && (
            <span className="badge" style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#ff4d4d',
              color: '#ffffff',
              fontSize: '0.7rem',
              fontWeight: '700',
              borderRadius: '10px',
              padding: '2px 6px',
              lineHeight: 1
            }}>
              {unreadNotifications}
            </span>
          )}
        </Link>

        {user && (
          <Link to={`/profile/${user.username}`} className="user-menu" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'var(--text-primary)' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={user.username} className="avatar" style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div className="avatar" style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'var(--accent)',
                color: 'var(--btn-primary-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                fontSize: '0.8rem'
              }}>
                {user.username.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span style={{ fontWeight: '600', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              {user.username}
              {user.is_verified && <CheckVerifiedIcon size={14} />}
            </span>
          </Link>
        )}
      </div>
    </header>
  );
};
