import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { exploreAPI, getMediaUrl } from '../services/api';
import { PostDetailModal } from '../components/PostDetailModal';
import {
  SearchIcon,
  CloseIcon,
  VideoIcon,
  FeedIcon,
  HeartIcon,
  CommentIcon,
  TrophyIcon,
  ZapIcon
} from '../components/common/Icons';

export const ExplorePage = () => {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const debounceTimerRef = useRef(null);

  const fetchExploreData = async (searchQ = '') => {
    setLoading(true);
    try {
      const res = await exploreAPI.getExplore(searchQ);
      setUsers(res.data.users || []);
      setPosts(res.data.posts || []);
    } catch (err) {
      console.error('Failed to load explore data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchExploreData(query);
    }, 250);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query]);

  // Pick exactly 3 random profiles (or top 3 matching if query is active)
  const displayedProfiles = useMemo(() => {
    if (!users || users.length === 0) return [];
    if (users.length <= 3) return users;
    // Shuffle and pick 3
    const shuffled = [...users].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }, [users]);

  const handlePostDeleted = (postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setSelectedPost(null);
  };

  const handlePostUpdated = (updatedPost) => {
    setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
    setSelectedPost(updatedPost);
  };

  return (
    <div className="explore-container">
      {/* Search Header Panel */}
      <div className="glass-panel explore-search-panel">
        <h2 className="explore-page-title">Explore SportsSphere</h2>
        <div className="explore-search-bar">
          <input
            type="text"
            placeholder="Search athletes, coaches, sports, or topics..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="explore-search-input"
          />
          <div className="explore-search-actions-right">
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="search-clear-btn"
                aria-label="Clear search"
              >
                <CloseIcon size={16} />
              </button>
            )}
            <span className="search-icon-decor-right">
              <SearchIcon size={18} />
            </span>
          </div>
        </div>
      </div>

      {/* Featured 3 Profiles Section */}
      {displayedProfiles.length > 0 && (
        <section className="explore-section">
          <div className="explore-section-header">
            <h3 className="explore-section-title">
              <ZapIcon size={18} style={{ color: 'var(--accent)' }} /> Suggested Profiles
            </h3>
            {users.length > 3 && (
              <span className="explore-section-subtitle">
                Showing 3 featured profiles
              </span>
            )}
          </div>
          <div className="explore-top-profiles-grid">
            {displayedProfiles.map((u) => {
              const avatarUrl = u.profile_picture ? getMediaUrl(u.profile_picture) : null;
              return (
                <Link
                  key={u.id}
                  to={`/profile/${u.username}`}
                  className="glass-panel explore-top-profile-card"
                >
                  <div className="explore-top-profile-avatar-wrap">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={u.username} className="explore-top-profile-avatar" />
                    ) : (
                      <div className="explore-top-profile-avatar-placeholder">
                        {u.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="explore-top-profile-name">
                    <span>{u.username}</span>
                    {u.is_verified && (
                      <svg className="verified-badge-sm" viewBox="0 0 24 24" width="14" height="14" fill="var(--accent)">
                        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    )}
                  </div>
                  <div className="explore-top-profile-role">
                    {u.role} {u.sport ? `• ${u.sport}` : ''}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 3x3 Explore Post Grid Section */}
      <section className="explore-section">
        <h3 className="explore-section-title">Trending & Explore Grid</h3>
        {loading ? (
          <div className="explore-loading">Loading explore feed...</div>
        ) : posts.length > 0 ? (
          <div className="explore-3x3-grid">
            {posts.map((post) => {
              const imageUrl = post.image ? getMediaUrl(post.image) : null;
              const videoUrl = post.video ? getMediaUrl(post.video) : null;
              const likesCount = post.likes_count || (post.likes ? post.likes.length : 0);
              const commentsCount = post.comments_count || (post.comments ? post.comments.length : 0);

              return (
                <div
                  key={post.id}
                  className="explore-grid-tile"
                  onClick={() => setSelectedPost(post)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedPost(post);
                    }
                  }}
                  aria-label={`View post by ${post.author?.username || 'user'}`}
                >
                  {/* Media Rendering */}
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={`Post by ${post.author?.username}`}
                      className="explore-grid-media"
                      loading="lazy"
                    />
                  ) : videoUrl ? (
                    <div className="explore-grid-video-wrap">
                      <video
                        src={videoUrl}
                        className="explore-grid-media"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    </div>
                  ) : (
                    /* Clean Minimalist Text/Quote Tile without dumping paragraph content */
                    <div className="explore-grid-text-tile">
                      <div className="explore-text-tile-icon">
                        <FeedIcon size={24} />
                      </div>
                      <span className="explore-text-tile-author">
                        @{post.author?.username || 'athlete'}
                      </span>
                    </div>
                  )}

                  {/* Indicator Badges for Video */}
                  {videoUrl && (
                    <div className="explore-tile-video-badge" title="Video post">
                      <VideoIcon size={14} />
                    </div>
                  )}

                  {/* Hover Overlay with Likes & Comments Count */}
                  <div className="explore-tile-overlay">
                    <div className="explore-overlay-stat">
                      <HeartIcon size={18} fill="currentColor" />
                      <span>{likesCount}</span>
                    </div>
                    <div className="explore-overlay-stat">
                      <CommentIcon size={18} fill="currentColor" />
                      <span>{commentsCount}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-panel explore-empty-card">
            No posts found for "{query}".
          </div>
        )}
      </section>

      {/* Full Post Modal Viewer */}
      <PostDetailModal
        post={selectedPost}
        isOpen={Boolean(selectedPost)}
        onClose={() => setSelectedPost(null)}
        onPostDeleted={handlePostDeleted}
        onPostUpdated={handlePostUpdated}
      />
    </div>
  );
};
