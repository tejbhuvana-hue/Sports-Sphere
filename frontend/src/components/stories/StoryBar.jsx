import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storiesAPI } from '../../services/api';
import { StoryRing } from './StoryRing';
import { StoryCreatorModal } from './StoryCreatorModal';
import { StoryViewerModal } from './StoryViewerModal';
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon } from '../common/Icons';

export const StoryBar = () => {
  const { user: currentUser, isAuthenticated } = useAuth();
  const [storyGroups, setStoryGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeUserIndex, setActiveUserIndex] = useState(0);

  const scrollContainerRef = useRef(null);

  const fetchTray = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const res = await storiesAPI.getStoriesTray();
      setStoryGroups(res.data || []);
    } catch (err) {
      console.error('Failed to load stories tray', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTray();
  }, [isAuthenticated]);

  const handleOpenCreator = (e) => {
    if (e) e.stopPropagation();
    setCreatorOpen(true);
  };

  const handleOpenViewer = (userIndex) => {
    const group = storyGroups[userIndex];
    if (!group || !group.stories || group.stories.length === 0) {
      // If clicked on own card and no stories exist, open creator
      if (group?.is_current_user) {
        setCreatorOpen(true);
      }
      return;
    }
    setActiveUserIndex(userIndex);
    setViewerOpen(true);
  };

  const handleStoryCreated = (newStory) => {
    fetchTray();
  };

  const handleStoryDeleted = (storyId, userIndex, storyIndex) => {
    fetchTray();
  };

  const handleStoryViewed = (storyId, userIdx, storyIdx) => {
    // Optimistically mark story as viewed locally
    setStoryGroups((prev) => {
      const updated = [...prev];
      if (updated[userIdx]?.stories?.[storyIdx]) {
        updated[userIdx].stories[storyIdx].has_viewed = true;
        // Check if all stories are now viewed
        const allSeen = updated[userIdx].stories.every((s) => s.has_viewed);
        updated[userIdx].has_unseen = !allSeen;
      }
      return updated;
    });
  };

  const scroll = (direction) => {
    if (!scrollContainerRef.current) return;
    const offset = direction === 'left' ? -240 : 240;
    scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  if (!isAuthenticated) return null;

  const myGroup = storyGroups.find((g) => g.is_current_user);
  const myStories = myGroup?.stories || [];
  const hasMyStories = myStories.length > 0;

  return (
    <div className="story-bar-wrapper glass-panel">
      {/* Scroll Left Button (Desktop) */}
      <button
        type="button"
        className="story-bar-scroll-btn story-bar-scroll-left"
        onClick={() => scroll('left')}
        aria-label="Scroll stories left"
      >
        <ChevronLeftIcon size={18} />
      </button>

      {/* Horizontal Story Tray Scroll Area */}
      <div className="story-bar-scroll-container" ref={scrollContainerRef}>
        {/* Current User: "Your Story" item */}
        <div className="story-bar-item story-bar-item-self">
          <div
            className="story-avatar-clickable"
            onClick={() => (hasMyStories ? handleOpenViewer(0) : handleOpenCreator())}
          >
            <StoryRing
              user={currentUser}
              hasStory={hasMyStories}
              isSeen={!myGroup?.has_unseen}
              isOwn={true}
              showAddBadge={true}
              size="md"
            />
          </div>
          <span className="story-bar-username">
            {hasMyStories ? 'Your Story' : 'Add Story'}
          </span>
        </div>

        {/* Followed Users with active stories */}
        {storyGroups
          .map((group, idx) => ({ group, originalIndex: idx }))
          .filter(({ group }) => !group.is_current_user && group.stories?.length > 0)
          .map(({ group, originalIndex }) => {
            const user = group.user || {};
            const isSeen = !group.has_unseen;

            return (
              <div
                key={user.id || originalIndex}
                className="story-bar-item"
                onClick={() => handleOpenViewer(originalIndex)}
              >
                <div className="story-avatar-clickable">
                  <StoryRing
                    user={user}
                    hasStory={true}
                    isSeen={isSeen}
                    isOwn={false}
                    size="md"
                  />
                </div>
                <span className="story-bar-username" title={user.username}>
                  {user.username}
                </span>
              </div>
            );
          })}
      </div>

      {/* Scroll Right Button (Desktop) */}
      <button
        type="button"
        className="story-bar-scroll-btn story-bar-scroll-right"
        onClick={() => scroll('right')}
        aria-label="Scroll stories right"
      >
        <ChevronRightIcon size={18} />
      </button>

      {/* Story Creator Modal */}
      {creatorOpen && (
        <StoryCreatorModal
          isOpen={creatorOpen}
          onClose={() => setCreatorOpen(false)}
          onStoryCreated={handleStoryCreated}
        />
      )}

      {/* Story Viewer Modal */}
      {viewerOpen && (
        <StoryViewerModal
          storyGroups={storyGroups}
          initialUserIndex={activeUserIndex}
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          onStoryDeleted={handleStoryDeleted}
          onStoryViewed={handleStoryViewed}
        />
      )}
    </div>
  );
};
