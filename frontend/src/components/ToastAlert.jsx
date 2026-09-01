import React from 'react';

export const ToastAlert = ({ message, type = 'info', onClose }) => {
  if (!message) return null;

  return (
    <div className={`alert-item alert-${type}`} style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 18px',
      borderRadius: '8px',
      marginBottom: '12px',
      animation: 'fadeIn 0.25s ease-in-out',
      fontSize: '0.9rem',
      fontWeight: '500'
    }}>
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            color: 'inherit',
            border: 'none',
            fontSize: '1.2rem',
            cursor: 'pointer',
            padding: '0 4px',
            lineHeight: 1
          }}
        >
          &times;
        </button>
      )}
    </div>
  );
};
