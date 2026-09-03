import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { performGoogleSignIn } from '../services/googleAuth';

export const GoogleSignInButton = ({
  role = 'PLAYER',
  onSuccess,
  onError,
  text = 'Continue with Google',
  disabled = false,
  style = {},
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithGoogle } = useAuth();

  const handleClick = async () => {
    if (isLoading || disabled) return;
    setIsLoading(true);
    if (onError) onError('');

    try {
      const idToken = await performGoogleSignIn();
      const userData = await loginWithGoogle(idToken, role);
      if (onSuccess) {
        onSuccess(userData);
      }
    } catch (err) {
      console.error('[GoogleSignInButton] Sign-in failed:', err);
      const message =
        err?.response?.data?.error ||
        err?.message ||
        'Google sign-in failed. Please try again.';
      if (onError) {
        onError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        width: '100%',
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid var(--input-border, rgba(255, 255, 255, 0.15))',
        background: 'var(--card-bg, rgba(255, 255, 255, 0.05))',
        color: 'var(--text-primary, #ffffff)',
        fontSize: '0.95rem',
        fontWeight: '600',
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
        opacity: disabled || isLoading ? 0.7 : 1,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isLoading) {
          e.currentTarget.style.background = 'var(--card-bg-hover, rgba(255, 255, 255, 0.1))';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isLoading) {
          e.currentTarget.style.background = 'var(--card-bg, rgba(255, 255, 255, 0.05))';
          e.currentTarget.style.borderColor = 'var(--input-border, rgba(255, 255, 255, 0.15))';
        }
      }}
    >
      {isLoading ? (
        <span
          style={{
            display: 'inline-block',
            width: '18px',
            height: '18px',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderTopColor: '#ffffff',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
      )}
      <span>{isLoading ? 'Connecting to Google...' : text}</span>
    </button>
  );
};
