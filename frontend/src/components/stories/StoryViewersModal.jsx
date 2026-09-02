import React, { useState, useEffect } from 'react';
import { storiesAPI, getMediaUrl } from '../../services/api';
import { CloseIcon, EyeIcon, CheckVerifiedIcon } from '../common/Icons';

export const StoryViewersModal = ({ storyId, isOpen, onClose }) => {
  const [viewers, setViewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !storyId) return;

    let isMounted = true;
    setLoading(true);
    setError('');

    storiesAPI
      .getStoryViewers(storyId)
      .then((res) => {
        if (isMounted) {
          setViewers(res.data.viewers || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to fetch story viewers', err);
          setError('Failed to load viewer list.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [storyId, isOpen]);

  if (!isOpen) return null;

  const formatTimeAgo = (dateStr) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${Math.floor(diffHours / 24)}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="story-modal-backdrop" onClick={onClose}>
      <div
        className="story-viewers-modal glass-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Story Viewers"
      >
        <div className="story-viewers-header">
          <div className="story-viewers-title">
            <EyeIcon size={18} />
            <span>Story Activity</span>
            <span className="story-viewers-badge">{viewers.length}</span>
          </div>
          <button
            type="button"
            className="story-btn-icon"
            onClick={onClose}
            aria-label="Close viewers modal"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="story-viewers-body">
          {loading ? (
            <div className="story-viewers-loading">
              <div className="reels-spinner" style={{ width: '24px', height: '24px' }}></div>
              <span>Loading viewers...</span>
            </div>
          ) : error ? (
            <div className="story-viewers-empty">{error}</div>
          ) : viewers.length > 0 ? (
            <div className="story-viewers-list">
              {viewers.map((v) => {
                const viewer = v.viewer || {};
                const picUrl = viewer.profile_picture ? getMediaUrl(viewer.profile_picture) : null;
                const initials = (viewer.username || 'U').slice(0, 2).toUpperCase();

                return (
                  <div key={v.id || viewer.id} className="story-viewer-item">
                    <div className="story-viewer-avatar-box">
                      {picUrl ? (
                        <img src={picUrl} alt={viewer.username} className="story-viewer-avatar" />
                      ) : (
                        <div className="story-viewer-avatar-fallback">{initials}</div>
                      )}
                    </div>
                    <div className="story-viewer-info">
                      <span className="story-viewer-username">
                        {viewer.username}
                        {viewer.is_verified && <CheckVerifiedIcon size={13} />}
                      </span>
                      <span className="story-viewer-time">{formatTimeAgo(v.viewed_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="story-viewers-empty">
              <EyeIcon size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
              <p style={{ margin: 0, fontWeight: 600 }}>No views yet</p>
              <span style={{ fontSize: '0.82rem', opacity: 0.7 }}>
                When athletes and coaches view your story, they'll show up here.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
