import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="public-footer">
      <div className="footer-container">
        <div className="footer-column brand-column">
          <span className="footer-logo">Sports<span>Sphere</span></span>
          <p className="footer-brand-desc">The digital arena for sports connection and scouting development.</p>
        </div>
        <div className="footer-column">
          <h5 className="footer-col-title">Quick Links</h5>
          <a href="/#hero" className="footer-link">Home</a>
          <a href="/#features" className="footer-link">Features</a>
          <a href="/#about" className="footer-link">About Us</a>
          <Link to="/contact" className="footer-link">Contact</Link>
        </div>
        <div className="footer-column">
          <h5 className="footer-col-title">Contact Support</h5>
          <span className="footer-info">📧 support@sportssphere.com</span>
          <span className="footer-info">📞 +91-9876543210</span>
          <span className="footer-info">📍 India</span>
        </div>
        <div className="footer-column social-col">
          <h5 className="footer-col-title">Follow Us</h5>
          <div className="social-row">
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="social-icon">LinkedIn</a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="social-icon">Instagram</a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="social-icon">Facebook</a>
            <a href="https://x.com" target="_blank" rel="noreferrer" className="social-icon">X</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        &copy; 2026 SportsSphere. All rights reserved.
      </div>
    </footer>
  );
};
