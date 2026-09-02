import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storiesAPI, getMediaUrl } from '../../services/api';
import { StoryViewersModal } from './StoryViewersModal';
import {
  CloseIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  TrashIcon,
  CheckVerifiedIcon,
  PlayIcon,
  PauseIcon
} from '../common/Icons';

const DEFAULT_STORY_DURATION_MS = 5000;

export const StoryViewerModal = ({
  storyGroups = [],
  initialUserIndex = 0,
  initialStoryIndex = 0,
  isOpen = false,
  onClose,
  onStoryDeleted,
  onStoryViewed,
}) => {
  const { user: currentUser } = useAuth();

  // Active indices
  const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);

  // Playback state
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100 for active story
  const [viewersModalOpen, setViewersModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const elapsedBeforePauseRef = useRef(0);
  const activeDurationRef = useRef(DEFAULT_STORY_DURATION_MS);

  // Sync initial indices when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentUserIndex(Math.max(0, Math.min(initialUserIndex, storyGroups.length - 1)));
      setCurrentStoryIndex(initialStoryIndex || 0);
      setProgress(0);
      setIsPaused(false);
      elapsedBeforePauseRef.current = 0;
    }
  }, [isOpen, initialUserIndex, initialStoryIndex, storyGroups.length]);

  const currentGroup = storyGroups[currentUserIndex];
  const stories = currentGroup?.stories || [];
  const activeStory = stories[currentStoryIndex];
  const isOwner = Boolean(
    currentUser &&
    activeStory &&
    (activeStory.is_owner || activeStory.user?.id === currentUser.id || activeStory.user?.username === currentUser.username)
  );

  // Record story view
  useEffect(() => {
    if (!isOpen || !activeStory) return;

    if (!activeStory.is_owner && !activeStory.has_viewed) {
      storiesAPI
        .viewStory(activeStory.id)
        .then(() => {
          if (onStoryViewed) {
            onStoryViewed(activeStory.id, currentUserIndex, currentStoryIndex);
          }
        })
        .catch((err) => {
          console.error('Failed to record story view', err);
        });
    }
  }, [isOpen, activeStory?.id, currentUserIndex, currentStoryIndex]);

  // Navigate to Next Story / Next User
  const handleNext = useCallback(() => {
    setProgress(0);
    elapsedBeforePauseRef.current = 0;

    if (currentStoryIndex < stories.length - 1) {
      // Advance to next story in current user's group
      setCurrentStoryIndex((prev) => prev + 1);
    } else if (currentUserIndex < storyGroups.length - 1) {
      // Advance to next user's story sequence
      setCurrentUserIndex((prev) => prev + 1);
      setCurrentStoryIndex(0);
    } else {
      // Reached the end of all stories -> close viewer
      onClose();
    }
  }, [currentStoryIndex, stories.length, currentUserIndex, storyGroups.length, onClose]);

  // Navigate to Previous Story / Previous User
  const handlePrev = useCallback(() => {
    setProgress(0);
    elapsedBeforePauseRef.current = 0;

    if (currentStoryIndex > 0) {
      // Go to previous story
      setCurrentStoryIndex((prev) => prev - 1);
    } else if (currentUserIndex > 0) {
      // Go to previous user's last story
      const prevUserIndex = currentUserIndex - 1;
      const prevUserStories = storyGroups[prevUserIndex]?.stories || [];
      setCurrentUserIndex(prevUserIndex);
      setCurrentStoryIndex(Math.max(0, prevUserStories.length - 1));
    }
  }, [currentStoryIndex, currentUserIndex, storyGroups]);

  // Timer & progress bar loop
  useEffect(() => {
    if (!isOpen || !activeStory || isPaused || viewersModalOpen) {
      clearInterval(progressIntervalRef.current);
      return;
    }

    // Determine duration
    let duration = DEFAULT_STORY_DURATION_MS;
    if (activeStory.story_type === 'VIDEO' && videoRef.current && !isNaN(videoRef.current.duration) && videoRef.current.duration > 0) {
      duration = videoRef.current.duration * 1000;
    }
    activeDurationRef.current = duration;

    const intervalTime = 50; // update progress every 50ms
    const startTimestamp = Date.now() - elapsedBeforePauseRef.current;
    startTimeRef.current = startTimestamp;

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimestamp;
      const currentPct = Math.min(100, (elapsed / duration) * 100);
      setProgress(currentPct);

      if (elapsed >= duration) {
        clearInterval(progressIntervalRef.current);
        handleNext();
      }
    }, intervalTime);

    return () => {
      clearInterval(progressIntervalRef.current);
    };
  }, [isOpen, activeStory, isPaused, viewersModalOpen, handleNext]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (viewersModalOpen) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPaused((p) => !p);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, viewersModalOpen, handleNext, handlePrev, onClose]);

  // Pause on Hold handlers
  const handleHoldStart = () => {
    if (viewersModalOpen) return;
    setIsPaused(true);
    elapsedBeforePauseRef.current = Date.now() - startTimeRef.current;
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const handleHoldEnd = () => {
    if (viewersModalOpen) return;
    setIsPaused(false);
    startTimeRef.current = Date.now() - elapsedBeforePauseRef.current;
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleDeleteStory = async () => {
    if (!activeStory || isDeleting) return;
    if (!window.confirm('Delete this story? This action cannot be undone.')) return;

    setIsDeleting(true);
    try {
      await storiesAPI.deleteStory(activeStory.id);
      if (onStoryDeleted) {
        onStoryDeleted(activeStory.id, currentUserIndex, currentStoryIndex);
      }

      // If only 1 story was in this group, advance or close
      if (stories.length <= 1) {
        if (currentUserIndex < storyGroups.length - 1) {
          setCurrentUserIndex((prev) => prev + 1);
          setCurrentStoryIndex(0);
        } else {
          onClose();
        }
      } else {
        setCurrentStoryIndex((prev) => Math.min(prev, stories.length - 2));
      }
    } catch (err) {
      console.error('Failed to delete story', err);
      alert('Failed to delete story. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || !currentGroup || !activeStory) return null;

  const author = currentGroup.user || activeStory.user || {};
  const authorPic = author.profile_picture ? getMediaUrl(author.profile_picture) : null;
  const authorInitials = (author.username || 'U').slice(0, 2).toUpperCase();

  const formatStoryTime = (dateStr) => {
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
    <div className="story-viewer-overlay">
      {/* Desktop Left/Right Navigation Arrow Buttons */}
      {currentUserIndex > 0 || currentStoryIndex > 0 ? (
        <button
          type="button"
          className="story-nav-desktop-btn story-nav-prev"
          onClick={handlePrev}
          aria-label="Previous story"
        >
          <ChevronLeftIcon size={24} color="#ffffff" />
        </button>
      ) : null}

      {currentUserIndex < storyGroups.length - 1 || currentStoryIndex < stories.length - 1 ? (
        <button
          type="button"
          className="story-nav-desktop-btn story-nav-next"
          onClick={handleNext}
          aria-label="Next story"
        >
          <ChevronRightIcon size={24} color="#ffffff" />
        </button>
      ) : null}

      {/* Main Story Container */}
      <div
        className="story-viewer-card"
        onMouseDown={handleHoldStart}
        onMouseUp={handleHoldEnd}
        onTouchStart={handleHoldStart}
        onTouchEnd={handleHoldEnd}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Top Segmented Progress Bars */}
        <div className="story-progress-bar-row">
          {stories.map((s, idx) => {
            let fillWidth = '0%';
            if (idx < currentStoryIndex) {
              fillWidth = '100%';
            } else if (idx === currentStoryIndex) {
              fillWidth = `${progress}%`;
            }
            return (
              <div key={s.id || idx} className="story-progress-segment-track">
                <div
                  className="story-progress-segment-fill"
                  style={{ width: fillWidth }}
                />
              </div>
            );
          })}
        </div>

        {/* Story Header */}
        <div className="story-viewer-header">
          <div className="story-viewer-user-info">
            <div className="story-viewer-avatar-small">
              {authorPic ? (
                <img src={authorPic} alt={author.username} />
              ) : (
                <div className="story-viewer-avatar-fallback">{authorInitials}</div>
              )}
            </div>
            <div className="story-viewer-name-box">
              <span className="story-viewer-username">
                {author.username}
                {author.is_verified && <CheckVerifiedIcon size={14} />}
              </span>
              <span className="story-viewer-timestamp">
                {formatStoryTime(activeStory.created_at)}
              </span>
            </div>
          </div>

          <div className="story-viewer-header-actions" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
            {/* Owner: Viewers analytics button */}
            {isOwner && (
              <button
                type="button"
                className="story-header-action-btn story-viewers-btn"
                onClick={() => setViewersModalOpen(true)}
                title="View Story Viewers"
                aria-label="Viewers list"
              >
                <EyeIcon size={16} />
                <span>{activeStory.views_count || 0}</span>
              </button>
            )}

            {/* Owner: Delete story button */}
            {isOwner && (
              <button
                type="button"
                className="story-header-action-btn story-delete-btn"
                onClick={handleDeleteStory}
                disabled={isDeleting}
                title="Delete this story"
                aria-label="Delete story"
              >
                <TrashIcon size={16} />
              </button>
            )}

            {/* Pause/Resume indicator toggle */}
            <button
              type="button"
              className="story-header-action-btn"
              onClick={() => setIsPaused((p) => !p)}
              title={isPaused ? 'Resume' : 'Pause'}
              aria-label={isPaused ? 'Resume story' : 'Pause story'}
            >
              {isPaused ? <PlayIcon size={16} /> : <PauseIcon size={16} />}
            </button>

            {/* Close button */}
            <button
              type="button"
              className="story-header-action-btn story-close-btn"
              onClick={onClose}
              title="Close Story Viewer"
              aria-label="Close story"
            >
              <CloseIcon size={20} />
            </button>
          </div>
        </div>

        {/* Story Content Canvas */}
        <div className="story-viewer-content-canvas">
          {/* TEXT STORY */}
          {activeStory.story_type === 'TEXT' && (
            <div
              className="story-viewer-text-slide"
              style={{ background: activeStory.background_style || 'var(--card-bg)' }}
            >
              <div className="story-viewer-text-content">
                {activeStory.text_content}
              </div>
            </div>
          )}

          {/* IMAGE STORY */}
          {activeStory.story_type === 'IMAGE' && (
            <div className="story-viewer-image-slide">
              <img
                src={getMediaUrl(activeStory.media)}
                alt={activeStory.text_content || 'Story media'}
                className="story-viewer-media-img"
              />
              {activeStory.text_content && (
                <div className="story-viewer-caption-bar">
                  <p>{activeStory.text_content}</p>
                </div>
              )}
            </div>
          )}

          {/* VIDEO STORY */}
          {activeStory.story_type === 'VIDEO' && (
            <div className="story-viewer-video-slide">
              <video
                ref={videoRef}
                src={getMediaUrl(activeStory.media)}
                autoPlay
                playsInline
                muted={false}
                className="story-viewer-media-video"
                onEnded={handleNext}
              />
              {activeStory.text_content && (
                <div className="story-viewer-caption-bar">
                  <p>{activeStory.text_content}</p>
                </div>
              )}
            </div>
          )}

          {/* Touch/Click Navigation Hotzones (Left 30% / Right 70%) */}
          <div
            className="story-tap-zone story-tap-left"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            title="Previous Story"
            aria-label="Previous story tap zone"
          />
          <div
            className="story-tap-zone story-tap-right"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            title="Next Story"
            aria-label="Next story tap zone"
          />
        </div>
      </div>

      {/* Story Viewers Analytics Drawer/Modal */}
      {viewersModalOpen && (
        <StoryViewersModal
          storyId={activeStory.id}
          isOpen={viewersModalOpen}
          onClose={() => setViewersModalOpen(false)}
        />
      )}
    </div>
  );
};
