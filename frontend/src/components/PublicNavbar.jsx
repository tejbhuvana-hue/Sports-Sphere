import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const PublicNavbar = () => {
  const { isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="top-navbar public-top-navbar">
      <div className="nav-brand">
        <button
          className="hamburger mobile-public-menu-btn"
          id="public-hamburger-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Public Menu"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
        <Link to="/" className="nav-brand">
          Sports<span>Sphere</span>
        </Link>
      </div>

      {/* Desktop navigation links */}
      <nav className="public-nav-links">
        <Link to="/#hero" className="pub-link">Home</Link>
        <Link to="/#about" className="pub-link">About</Link>
        <Link to="/#features" className="pub-link">Features</Link>
        <Link to="/blogs" className="pub-link">Blogs</Link>
        <Link to="/contact" className="pub-link">Contact</Link>
      </nav>

      <div className="nav-actions">
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          className="theme-toggle-btn"
          aria-label="Toggle Theme"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        {isAuthenticated ? (
          <Link to="/feed" className="btn btn-primary btn-sm">
            Go to App &rarr;
          </Link>
        ) : (
          <Link to="/login" className="btn btn-primary btn-sm">Login</Link>
        )}
      </div>

      {/* Mobile dropdown menu for public layout */}
      {mobileMenuOpen && (
        <div className="mobile-public-dropdown glass-panel">
          <Link to="/#hero" className="mobile-pub-link" onClick={() => setMobileMenuOpen(false)}>Home</Link>
          <Link to="/#about" className="mobile-pub-link" onClick={() => setMobileMenuOpen(false)}>About</Link>
          <Link to="/#features" className="mobile-pub-link" onClick={() => setMobileMenuOpen(false)}>Features</Link>
          <Link to="/blogs" className="mobile-pub-link" onClick={() => setMobileMenuOpen(false)}>Blogs</Link>
          <Link to="/contact" className="mobile-pub-link" onClick={() => setMobileMenuOpen(false)}>Contact</Link>
          <div className="mobile-pub-divider"></div>
          {isAuthenticated ? (
            <Link to="/feed" className="btn btn-primary btn-sm mobile-pub-action" onClick={() => setMobileMenuOpen(false)}>
              Go to Feed &rarr;
            </Link>
          ) : (
            <div className="mobile-pub-auth-btns">
              <Link to="/login" className="btn btn-primary btn-sm" onClick={() => setMobileMenuOpen(false)}>Login</Link>
              <Link to="/register" className="btn btn-secondary btn-sm" onClick={() => setMobileMenuOpen(false)}>Register</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
