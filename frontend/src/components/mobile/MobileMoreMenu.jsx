import React, { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMediaUrl } from '../../services/api';
import {
  UserIcon,
  TargetIcon,
  TrophyIcon,
  BriefcaseIcon,
  FileTextIcon,
  UsersGroupIcon,
  StatsIcon,
  NewspaperIcon,
  BellIcon,
  SettingsIcon,
  MessagesIcon,
  ShieldIcon,
  LogOutIcon,
  CheckVerifiedIcon,
  CloseIcon,
  ChevronRightIcon,
  BookmarkIcon
} from '../common/Icons';

export const MobileMoreMenu = ({ isOpen, onClose }) => {
  const { user, logout, isAdmin, unreadNotifications } = useAuth();
  const navigate = useNavigate();

  // Prevent background scrolling when menu drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/login');
  };

  const avatarUrl = user?.profile?.profile_picture ? getMediaUrl(user.profile.profile_picture) : null;

  return (
    <div className="mobile-more-overlay" onClick={onClose}>
      <div className="mobile-more-drawer glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Drag Handle */}
        <div className="mobile-drawer-header">
          <div className="mobile-drawer-handle"></div>
          <div className="mobile-drawer-title-row">
            <h3 className="mobile-drawer-title">Menu & Features</h3>
            <button type="button" className="mobile-drawer-close" onClick={onClose} aria-label="Close">
              <CloseIcon size={20} />
            </button>
          </div>
        </div>

        {/* User Card Header in Drawer */}
        {user && (
          <NavLink
            to={`/profile/${user.username}`}
            className="mobile-drawer-user-card"
            onClick={onClose}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={user.username} className="avatar-img-md" />
            ) : (
              <div className="avatar-placeholder-md">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="mobile-drawer-user-info">
              <div className="mobile-drawer-username">
                {user.username}
                {user.is_verified && <CheckVerifiedIcon size={14} />}
              </div>
              <div className="mobile-drawer-user-role">
                {user.role} {user.profile?.sport ? `• ${user.profile.sport}` : ''}
              </div>
            </div>
            <span className="mobile-drawer-chevron">
              <ChevronRightIcon size={18} />
            </span>
          </NavLink>
        )}

        {/* Navigation Links Grid / List */}
        <div className="mobile-drawer-links-scroll">
          <div className="mobile-drawer-section">
            <span className="mobile-drawer-section-label">Sports Network</span>

            <NavLink to={`/profile/${user?.username}`} className="mobile-drawer-item" onClick={onClose}>
              <div className="mobile-drawer-item-icon">
                <UserIcon size={18} />
              </div>
              <span className="mobile-drawer-item-label">My Profile</span>
            </NavLink>

            <NavLink to="/saved" className="mobile-drawer-item" onClick={onClose}>
              <div className="mobile-drawer-item-icon">
                <BookmarkIcon size={18} color="var(--accent)" />
              </div>
              <span className="mobile-drawer-item-label">Saved Reels & Posts</span>
            </NavLink>

            <NavLink to="/recruitment" className="mobile-drawer-item" onClick={onClose}>
              <div className="mobile-drawer-item-icon">
                <TargetIcon size={18} />
              </div>
              <span className="mobile-drawer-item-label">Recruitment & Trials</span>
            </NavLink>

            <NavLink to="/tournaments" className="mobile-drawer-item" onClick={onClose}>
              <div className="mobile-drawer-item-icon">
                <TrophyIcon size={18} />
              </div>
              <span className="mobile-drawer-item-label">Tournaments & Leagues</span>
            </NavLink>

            <NavLink to="/sponsorships" className="mobile-drawer-item" onClick={onClose}>
              <div className="mobile-drawer-item-icon">
                <BriefcaseIcon size={18} />
              </div>
              <span className="mobile-drawer-item-label">Sponsorship Marketplace</span>
            </NavLink>

            {user?.role === 'PLAYER' && (
              <NavLink to="/sponsorships/my-applications" className="mobile-drawer-item" onClick={onClose}>
                <div className="mobile-drawer-item-icon">
                  <FileTextIcon size={18} />
                </div>
                <span className="mobile-drawer-item-label">My Sponsorship Deals</span>
              </NavLink>
            )}

            {user?.role === 'CLUB' && (
              <NavLink to="/club/dashboard" className="mobile-drawer-item highlight" onClick={onClose}>
                <div className="mobile-drawer-item-icon">
                  <UsersGroupIcon size={18} />
                </div>
                <span className="mobile-drawer-item-label">Club Dashboard</span>
              </NavLink>
            )}

            {user?.role === 'SPONSOR' && (
              <NavLink to="/sponsorships/dashboard" className="mobile-drawer-item highlight" onClick={onClose}>
                <div className="mobile-drawer-item-icon">
                  <StatsIcon size={18} />
                </div>
                <span className="mobile-drawer-item-label">Sponsor Dashboard</span>
              </NavLink>
            )}
          </div>

          <div className="mobile-drawer-section">
            <span className="mobile-drawer-section-label">Explore & Support</span>

            <NavLink to="/blogs" className="mobile-drawer-item" onClick={onClose}>
              <div className="mobile-drawer-item-icon">
                <NewspaperIcon size={18} />
              </div>
              <span className="mobile-drawer-item-label">Blogs & News</span>
            </NavLink>

            <NavLink to="/notifications" className="mobile-drawer-item" onClick={onClose}>
              <div className="mobile-drawer-item-icon">
                <BellIcon size={18} />
              </div>
              <span className="mobile-drawer-item-label">Notifications</span>
              {unreadNotifications > 0 && (
                <span className="mobile-drawer-badge">{unreadNotifications}</span>
              )}
            </NavLink>

            <NavLink to="/settings" className="mobile-drawer-item" onClick={onClose}>
              <div className="mobile-drawer-item-icon">
                <SettingsIcon size={18} />
              </div>
              <span className="mobile-drawer-item-label">Settings</span>
            </NavLink>

            <NavLink to="/contact" className="mobile-drawer-item" onClick={onClose}>
              <div className="mobile-drawer-item-icon">
                <MessagesIcon size={18} />
              </div>
              <span className="mobile-drawer-item-label">Contact & Support</span>
            </NavLink>

            {isAdmin && (
              <NavLink to="/admin-dashboard" className="mobile-drawer-item admin-item" onClick={onClose}>
                <div className="mobile-drawer-item-icon">
                  <ShieldIcon size={18} />
                </div>
                <span className="mobile-drawer-item-label">Admin Dashboard</span>
              </NavLink>
            )}
          </div>

          {/* Logout Button */}
          <div className="mobile-drawer-footer">
            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-secondary mobile-drawer-logout-btn"
            >
              <LogOutIcon size={18} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
