import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storiesAPI } from '../../services/api';
import { StoryRing } from './StoryRing';
import { StoryCreatorModal } from './StoryCreatorModal';
import { StoryViewerModal } from './StoryViewerModal';
import { ChevronLeftIcon, ChevronRightIcon } from '../common/Icons';

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
    if (e && e.stopPropagation) e.stopPropagation();
    setCreatorOpen(true);
  };

  // Only groups with at least 1 active story for the sequential viewer
  const activeStoryGroups = storyGroups.filter((g) => g.stories && g.stories.length > 0);

  const handleOpenOwnStory = () => {
    const myGroup = storyGroups.find((g) => g.is_current_user);
    if (myGroup && myGroup.stories && myGroup.stories.length > 0) {
      // Find own index in activeStoryGroups
      const ownIdx = activeStoryGroups.findIndex((g) => g.is_current_user);
      setActiveUserIndex(ownIdx !== -1 ? ownIdx : 0);
      setViewerOpen(true);
    } else {
      // If no active story, open creator
      setCreatorOpen(true);
    }
  };

  const handleOpenFollowedViewer = (userId) => {
    const activeIdx = activeStoryGroups.findIndex((g) => g.user?.id === userId);
    if (activeIdx !== -1) {
      setActiveUserIndex(activeIdx);
      setViewerOpen(true);
    }
  };

  const handleStoryCreated = (newStory) => {
    fetchTray();
  };

  const handleStoryDeleted = (storyId) => {
    fetchTray();
  };

  const handleStoryViewed = (storyId, activeIdx, storyIdx) => {
    // Optimistically mark story as viewed locally
    setStoryGroups((prev) => {
      const updated = [...prev];
      const targetGroup = activeStoryGroups[activeIdx];
      if (!targetGroup) return prev;

      const rawIdx = updated.findIndex((g) => g.user?.id === targetGroup.user?.id);
      if (rawIdx !== -1 && updated[rawIdx]?.stories?.[storyIdx]) {
        updated[rawIdx].stories[storyIdx].has_viewed = true;
        const allSeen = updated[rawIdx].stories.every((s) => s.has_viewed);
        updated[rawIdx].has_unseen = !allSeen;
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
  const followedGroupsWithStories = storyGroups.filter(
    (group) => !group.is_current_user && group.stories?.length > 0
  );

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
            onClick={handleOpenOwnStory}
            title={hasMyStories ? 'View your story' : 'Add a story'}
          >
            <StoryRing
              user={currentUser}
              hasStory={hasMyStories}
              isSeen={!myGroup?.has_unseen}
              isOwn={true}
              showAddBadge={true}
              size="md"
              onAddClick={handleOpenCreator}
            />
          </div>
          <span className="story-bar-username" onClick={handleOpenOwnStory}>
            Your Story
          </span>
        </div>

        {/* Followed Users with active stories */}
        {followedGroupsWithStories.map((group) => {
          const user = group.user || {};
          const isSeen = !group.has_unseen;

          return (
            <div
              key={user.id}
              className="story-bar-item"
              onClick={() => handleOpenFollowedViewer(user.id)}
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
      {viewerOpen && activeStoryGroups.length > 0 && (
        <StoryViewerModal
          storyGroups={activeStoryGroups}
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
