import React, { useEffect } from 'react';
import { PostCard } from './PostCard';
import { CloseIcon } from './common/Icons';

export const PostDetailModal = ({ post, isOpen, onClose, onPostDeleted, onPostUpdated }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !post) return null;

  return (
    <div className="post-detail-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="post-detail-modal-container" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="post-detail-modal-close-btn"
          onClick={onClose}
          aria-label="Close post"
        >
          <CloseIcon size={20} />
        </button>
        <div className="post-detail-modal-content">
          <PostCard
            post={post}
            onPostDeleted={(id) => {
              if (onPostDeleted) onPostDeleted(id);
              onClose();
            }}
            onPostUpdated={(updated) => {
              if (onPostUpdated) onPostUpdated(updated);
            }}
          />
        </div>
      </div>
    </div>
  );
};
