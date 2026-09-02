import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getMediaUrl } from '../../services/api';
import { PlusIcon, SunIcon, MoonIcon, BellIcon, CheckVerifiedIcon } from '../common/Icons';

export const MobileTopBar = ({ onOpenCreatePost }) => {
  const { user, unreadNotifications } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const avatarUrl = user?.profile?.profile_picture ? getMediaUrl(user.profile.profile_picture) : null;

  return (
    <header className="mobile-topbar" id="mobile-topbar">
      {/* 1. SportsSphere Brand */}
      <Link to="/home" className="mobile-topbar-brand" title="SportsSphere Home">
        Sports<span className="brand-accent">Sphere</span>
      </Link>

      {/* Action items on right side */}
      <div className="mobile-topbar-actions">
        {/* Theme Toggle Icon (Moon for Light theme, Sun for Dark theme) */}
        <button
          type="button"
          onClick={toggleTheme}
          className="mobile-topbar-icon-btn mobile-theme-btn"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          aria-label="Toggle Theme"
        >
          {theme === 'light' ? <MoonIcon size={21} /> : <SunIcon size={21} />}
        </button>

        {/* 2. Plus Icon: Create Post */}
        <button
          type="button"
          onClick={onOpenCreatePost}
          className="mobile-topbar-icon-btn mobile-add-btn"
          title="Create New Post"
          aria-label="Create Post"
          id="mobile-create-post-topbar-btn"
        >
          <PlusIcon size={23} strokeWidth={2.4} />
        </button>

        {/* 3. Authenticated Username / Profile link */}
        {user && (
          <Link
            to={`/profile/${user.username}`}
            className="mobile-topbar-user-link"
            title={`View profile @${user.username}`}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={user.username} className="mobile-topbar-avatar" />
            ) : (
              <div className="mobile-topbar-avatar-placeholder">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="mobile-topbar-username">
              {user.username}
              {user.is_verified && <CheckVerifiedIcon size={12} className="verified-badge-sm" />}
            </span>
          </Link>
        )}

        {/* 4. Notifications with Unread Count */}
        <Link
          to="/notifications"
          className="mobile-topbar-icon-btn mobile-notif-btn"
          title="Notifications"
          aria-label="Notifications"
        >
          <BellIcon size={20} />
          {unreadNotifications > 0 && (
            <span className="mobile-notif-badge">
              {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
};
