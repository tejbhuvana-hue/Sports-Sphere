import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LeftSidebar = ({ isOpen, onClose }) => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className={`left-sidebar glass-panel ${isOpen ? 'open' : ''}`} id="left-sidebar">
      <ul className="sidebar-menu" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        <li className="sidebar-item">
          <NavLink to="/home" className={({ isActive }) => (isActive ? 'active' : '')} onClick={onClose}>
            <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            Home
          </NavLink>
        </li>
        <li className="sidebar-item">
          <NavLink to="/feed" className={({ isActive }) => (isActive ? 'active' : '')} onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            Feed
          </NavLink>
        </li>
        <li className="sidebar-item">
          <NavLink to="/explore" className={({ isActive }) => (isActive ? 'active' : '')} onClick={onClose}>
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            Explore
          </NavLink>
        </li>
        <li className="sidebar-item">
          <NavLink to="/messages" className={({ isActive }) => (isActive ? 'active' : '')} onClick={onClose}>
            <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
            Messages
          </NavLink>
        </li>
        <li className="sidebar-item">
          <NavLink to="/notifications" className={({ isActive }) => (isActive ? 'active' : '')} onClick={onClose}>
            <svg viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
            Notifications
          </NavLink>
        </li>
        <li className="sidebar-item">
          <NavLink to="/tournaments" className={({ isActive }) => (isActive ? 'active' : '')} onClick={onClose}>
            <svg viewBox="0 0 24 24"><path d="M18 2H6c-1.1 0-2 .9-2 2v7c0 2.24 1.57 4.12 3.66 4.6l-1.09 2.5c-.24.55.16 1.15.76 1.15H16.67c.6 0 1-.6.76-1.15l-1.09-2.5C18.43 15.12 20 13.24 20 11V4c0-1.1-.9-2-2-2zm-2 9H8V4h8v7z"/></svg>
            Tournaments
          </NavLink>
        </li>
        <li className="sidebar-item">
          <NavLink to="/recruitment" className={({ isActive }) => (isActive ? 'active' : '')} onClick={onClose}>
            <svg viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>
            Recruitment
          </NavLink>
        </li>
        <li className="sidebar-item">
          <NavLink to="/saved" className={({ isActive }) => (isActive ? 'active' : '')} onClick={onClose}>
            <svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            Saved Reels
          </NavLink>
        </li>

        {user?.role === 'CLUB' && (
          <li className="sidebar-item">
            <NavLink to="/club/dashboard" className={({ isActive }) => (isActive ? 'active' : '')} onClick={onClose}>
              <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
              Club Dashboard
            </NavLink>
          </li>
        )}

        {user?.role === 'SPONSOR' && (
          <li className="sidebar-item">
            <NavLink to="/sponsorships/dashboard" className={({ isActive }) => (isActive ? 'active' : '')} onClick={onClose}>
              <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
              Sponsor Dashboard
            </NavLink>
          </li>
        )}

        <li className="sidebar-item">
          <NavLink to="/sponsorships" className={({ isActive }) => (isActive ? 'active' : '')} onClick={onClose}>
            <svg viewBox="0 0 24 24"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
            Sponsorships
          </NavLink>
        </li>

        <li className="sidebar-item">
          <NavLink to={`/profile/${user?.username}`} className={({ isActive }) => (isActive ? 'active' : '')} onClick={onClose}>
            <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            Profile
          </NavLink>
        </li>

        <li className="sidebar-item">
          <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')} onClick={onClose}>
            <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
            Settings
          </NavLink>
        </li>

        {isAdmin && (
          <li className="sidebar-item">
            <NavLink to="/admin-dashboard" className={({ isActive }) => (isActive ? 'active' : '')} onClick={onClose} style={{ color: 'var(--accent)', fontWeight: '700' }}>
              <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
              Admin Dashboard
            </NavLink>
          </li>
        )}
      </ul>

      <div style={{ marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
        <button
          onClick={handleLogout}
          className="btn btn-secondary btn-sm"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>
          Logout
        </button>
      </div>
    </aside>
  );
};
