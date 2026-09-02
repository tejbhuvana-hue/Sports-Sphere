import React from 'react';
import { getMediaUrl } from '../../services/api';
import { PlusIcon } from '../common/Icons';

export const StoryRing = ({
  user,
  hasStory = false,
  isSeen = false,
  isOwn = false,
  showAddBadge = false,
  size = 'md',
  onClick,
  onAddClick,
  className = '',
}) => {
  const avatarUrl = user?.profile_picture
    ? getMediaUrl(user.profile_picture)
    : user?.profile?.profile_picture
    ? getMediaUrl(user.profile.profile_picture)
    : null;

  const initials = (user?.username || 'U').slice(0, 2).toUpperCase();

  // Determine ring styling class
  let ringClass = 'story-ring-none';
  if (hasStory) {
    // If own active story or unseen story, show active ring; if seen, show subtle ring
    ringClass = isOwn ? 'story-ring-unseen' : (isSeen ? 'story-ring-seen' : 'story-ring-unseen');
  }

  const handleBadgeClick = (e) => {
    e.stopPropagation();
    if (onAddClick) {
      onAddClick(e);
    } else if (onClick) {
      onClick(e);
    }
  };

  return (
    <div
      className={`story-ring-wrapper story-ring-${size} ${ringClass} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      aria-label={
        isOwn
          ? hasStory
            ? 'View your active story'
            : 'Add new story'
          : hasStory
          ? `View ${user?.username}'s story`
          : `${user?.username}'s profile`
      }
    >
      <div className="story-ring-inner">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={user?.username || 'User avatar'}
            className="story-ring-avatar-img"
            loading="lazy"
          />
        ) : (
          <div className="story-ring-avatar-placeholder">
            {initials}
          </div>
        )}
      </div>

      {showAddBadge && (
        <div
          className="story-ring-add-badge"
          title="Add Story"
          role="button"
          tabIndex={0}
          onClick={handleBadgeClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleBadgeClick(e);
            }
          }}
          aria-label="Add new story"
        >
          <PlusIcon size={12} color="#ffffff" strokeWidth={3} />
        </div>
      )}
    </div>
  );
};
