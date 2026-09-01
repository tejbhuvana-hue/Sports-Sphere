import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', background: '#060e1a' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(0, 217, 255, 0.2)',
          borderTop: '3px solid #00d9ff',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin-login" replace />;
  }

  if (!isAdmin) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#060e1a',
        color: '#ffffff',
        fontFamily: 'Outfit, sans-serif',
        padding: '20px'
      }}>
        <div style={{
          background: 'rgba(13, 27, 49, 0.8)',
          border: '1px solid rgba(255, 75, 75, 0.3)',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '480px',
          textAlign: 'center',
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🚫</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ff5252', marginBottom: '12px' }}>
            Access Denied
          </h2>
          <p style={{ color: '#8b9bb4', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '24px' }}>
            Administrator credentials required. Your current account (<strong style={{ color: '#fff' }}>{user?.username}</strong>) does not possess superuser privileges.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link to="/feed" style={{
              background: '#00d9ff',
              color: '#081426',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: '700',
              textDecoration: 'none',
              fontSize: '0.9rem'
            }}>
              Return to Feed
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
};
