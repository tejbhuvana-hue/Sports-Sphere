import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { postsAPI, getMediaUrl } from '../services/api';
import { PostCard } from '../components/PostCard';
import { ReelSlide } from '../components/ReelSlide';
import { StoryBar } from '../components/stories/StoryBar';
import { CameraIcon, VideoIcon, FeedIcon, CloseIcon, ZapIcon, CheckVerifiedIcon } from '../components/common/Icons';

export const FeedPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);
  const [reelsMode, setReelsMode] = useState(true); // default reels mode on mobile

  const reelsContainerRef = useRef(null);

  const filterOutOwnPosts = (postsList) => {
    if (!postsList) return [];
    if (!user) return postsList;
    return postsList.filter(
      (p) => p.author?.username !== user.username && p.author?.id !== user.id && !p.is_author
    );
  };

  const fetchPosts = async () => {
    try {
      const res = await postsAPI.getPosts();
      const filtered = filterOutOwnPosts(res.data || []);
      setPosts(filtered);
    } catch (err) {
      console.error('Failed to load posts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();

    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);

    // Listen for new posts created globally via the MobileTopBar '+' modal
    const handleGlobalNewPost = (e) => {
      if (e.detail) {
        // Only append if not authored by the current logged-in user
        const isOwn =
          e.detail.author?.username === user?.username ||
          e.detail.author?.id === user?.id ||
          e.detail.is_author;
        if (!isOwn) {
          setPosts((prev) => [e.detail, ...prev]);
          setActiveReelIndex(0);
        }
      }
    };

    window.addEventListener('sports_sphere_new_post', handleGlobalNewPost);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('sports_sphere_new_post', handleGlobalNewPost);
    };
  }, [user]);

  // Track active reel on scroll in reels mode and trigger infinite load
  useEffect(() => {
    const container = reelsContainerRef.current;
    if (!container || !reelsMode) return;

    const handleScroll = () => {
      const height = container.clientHeight;
      if (height <= 0) return;
      const scrollPos = container.scrollTop;
      const currentIndex = Math.round(scrollPos / height);
      if (currentIndex !== activeReelIndex && currentIndex >= 0 && currentIndex < posts.length) {
        setActiveReelIndex(currentIndex);

        // Unlimited Feed: If near the end of loaded posts, seamlessly append more posts
        if (currentIndex >= posts.length - 2 && posts.length > 0) {
          const recycled = posts.slice(0, 10).map((p, i) => ({
            ...p,
            id: `${p.id}_inf_${Date.now()}_${i}`,
            original_id: p.original_id || p.id,
          }));
          setPosts((prev) => [...prev, ...recycled]);
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [reelsMode, posts, activeReelIndex]);

  // Keyboard navigation for reels (ArrowUp / ArrowDown)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!reelsMode || (!isMobileView && !reelsMode)) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        scrollToReel(activeReelIndex + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        scrollToReel(activeReelIndex - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [reelsMode, activeReelIndex, posts.length]);

  const scrollToReel = (index) => {
    if (index < 0 || !reelsContainerRef.current) return;
    const container = reelsContainerRef.current;
    const height = container.clientHeight;
    container.scrollTo({
      top: index * height,
      behavior: 'smooth',
    });
    setActiveReelIndex(index);
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!content.trim() && !imageFile && !videoFile) return;

    setIsSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      const formData = new FormData();
      if (content.trim()) formData.append('content', content.trim());
      if (imageFile) formData.append('image', imageFile);
      if (videoFile) formData.append('video', videoFile);

      await postsAPI.createPost(formData);
      // Own post is not placed in the user's feed, only in their profile
      setContent('');
      setImageFile(null);
      setVideoFile(null);
      setSuccessMsg('Post published! Your post is visible to others in their feed, and you can view it anytime on your profile.');
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostDeleted = (postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId && p.original_id !== postId));
  };

  const handlePostUpdated = (updatedPost) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === updatedPost.id || p.original_id === updatedPost.id ? updatedPost : p))
    );
  };

  const avatarUrl = user?.profile?.profile_picture ? getMediaUrl(user.profile.profile_picture) : null;

  // Render Mobile Reels Experience when on mobile and reelsMode is active
  if (isMobileView && reelsMode) {
    return (
      <div className="mobile-reels-page-wrapper">
        {loading ? (
          <div className="reels-loading-box">
            <div className="reels-spinner"></div>
            <span>Loading Sports Reels...</span>
          </div>
        ) : posts.length > 0 ? (
          <div className="reels-viewport-container" ref={reelsContainerRef}>
            {posts.map((post, idx) => (
              <ReelSlide
                key={post.id || idx}
                post={post}
                isActive={idx === activeReelIndex}
                onPostDeleted={handlePostDeleted}
                onPostUpdated={handlePostUpdated}
              />
            ))}
          </div>
        ) : (
          <div className="glass-panel feed-empty-state" style={{ margin: '40px 16px' }}>
            <FeedIcon size={44} className="empty-icon" />
            <h3 className="empty-title">Your Feed is Quiet</h3>
            <p className="empty-desc">
              Be the first to share an update, highlight reel, or connect with other athletes!
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="feed-container">
      {/* Stories Bar (Instagram-like Stories Tray) */}
      <StoryBar />

      {/* Mobile view mode toggle banner if on mobile */}
      {isMobileView && (
        <div className="mobile-view-toggle-bar">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setReelsMode(true)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}
          >
            <ZapIcon size={16} /> Switch to Fullscreen Reels Mode
          </button>
        </div>
      )}

      {/* Create Post Box (Desktop / Tablet inline) */}
      <div className="create-post-panel glass-panel">
        {error && (
          <div className="alert-box alert-danger">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="alert-box alert-success" style={{ background: 'rgba(0, 230, 118, 0.12)', border: '1px solid rgba(0, 230, 118, 0.3)', color: 'var(--text-primary)', padding: '10px 14px', borderRadius: '10px', marginBottom: '14px', fontSize: '0.88rem' }}>
            ✓ {successMsg}
          </div>
        )}
        <form onSubmit={handleCreatePost}>
          <div className="create-post-input-row">
            {avatarUrl ? (
              <img src={avatarUrl} alt={user?.username} className="avatar-img-sm" />
            ) : (
              <div className="avatar-placeholder-sm">
                {user?.username ? user.username.slice(0, 2).toUpperCase() : 'U'}
              </div>
            )}
            <textarea
              rows={3}
              placeholder="Share your latest performance, achievements, or thoughts..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="create-post-textarea"
            />
          </div>

          {(imageFile || videoFile) && (
            <div className="selected-media-tag">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {imageFile ? <CameraIcon size={16} /> : <VideoIcon size={16} />}
                {imageFile ? imageFile.name : videoFile?.name}
              </span>
              <button
                type="button"
                onClick={() => { setImageFile(null); setVideoFile(null); }}
                className="remove-media-btn"
                title="Remove attached file"
              >
                <CloseIcon size={16} />
              </button>
            </div>
          )}

          <div className="create-post-footer">
            <div className="create-post-actions">
              <label className="file-attach-label">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      setImageFile(e.target.files[0]);
                      setVideoFile(null);
                    }
                  }}
                  style={{ display: 'none' }}
                />
                <CameraIcon size={18} /> Photo
              </label>

              <label className="file-attach-label">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      setVideoFile(e.target.files[0]);
                      setImageFile(null);
                    }
                  }}
                  style={{ display: 'none' }}
                />
                <VideoIcon size={18} /> Video
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || (!content.trim() && !imageFile && !videoFile)}
              className="btn btn-primary btn-sm btn-post-submit"
            >
              {isSubmitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>

      {/* Feed Posts List */}
      {loading ? (
        <div className="feed-loading-state">
          Loading your sports feed...
        </div>
      ) : posts.length > 0 ? (
        <div className="feed-posts-stream">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onPostDeleted={handlePostDeleted}
              onPostUpdated={handlePostUpdated}
            />
          ))}
        </div>
      ) : (
        <div className="glass-panel feed-empty-state">
          <FeedIcon size={44} className="empty-icon" />
          <h3 className="empty-title">Your Feed is Quiet</h3>
          <p className="empty-desc">
            Be the first to share an update, highlight reel, or connect with other athletes!
          </p>
        </div>
      )}
    </div>
  );
};
