import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const MobileBottomNav = ({ onToggleMore, isMoreOpen }) => {
  const { unreadMessages } = useAuth();
  const location = useLocation();

  const isSearchActive = location.pathname.startsWith('/search') || location.pathname.startsWith('/explore');
  const isMsgsActive = location.pathname.startsWith('/messages');

  return (
    <nav className="mobile-bottom-nav" id="mobile-bottom-nav" aria-label="Mobile Navigation">
      <div className="mobile-bottom-nav-inner">
        {/* 1. Home */}
        <NavLink
          to="/"
          end
          className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          aria-label="Home"
        >
          <div className="mobile-nav-icon-wrap">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </div>
          <span className="mobile-nav-label">Home</span>
        </NavLink>

        {/* 2. Feed */}
        <NavLink
          to="/feed"
          className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          aria-label="Feed"
        >
          <div className="mobile-nav-icon-wrap">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
            </svg>
          </div>
          <span className="mobile-nav-label">Feed</span>
        </NavLink>

        {/* 3. Msgs */}
        <NavLink
          to="/messages"
          className={`mobile-nav-item ${isMsgsActive ? 'active' : ''}`}
          aria-label="Messages"
        >
          <div className="mobile-nav-icon-wrap" style={{ position: 'relative' }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
            </svg>
            {unreadMessages > 0 && (
              <span className="mobile-nav-badge">
                {unreadMessages > 99 ? '99+' : unreadMessages}
              </span>
            )}
          </div>
          <span className="mobile-nav-label">Msgs</span>
        </NavLink>

        {/* 4. Search */}
        <NavLink
          to="/explore"
          className={`mobile-nav-item ${isSearchActive ? 'active' : ''}`}
          aria-label="Search and Explore"
        >
          <div className="mobile-nav-icon-wrap">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
          </div>
          <span className="mobile-nav-label">Search</span>
        </NavLink>

        {/* 5. More */}
        <button
          type="button"
          onClick={onToggleMore}
          className={`mobile-nav-item mobile-nav-btn ${isMoreOpen ? 'active' : ''}`}
          aria-label="More Menu"
        >
          <div className="mobile-nav-icon-wrap">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </div>
          <span className="mobile-nav-label">More</span>
        </button>
      </div>
    </nav>
  );
};
