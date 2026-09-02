import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { exploreAPI, getMediaUrl } from '../services/api';
import { PostCard } from '../components/PostCard';
import { PostDetailModal } from '../components/PostDetailModal';
import { SearchIcon, TrophyIcon, MapPinIcon, CloseIcon, VideoIcon, FeedIcon, HeartIcon, CommentIcon } from '../components/common/Icons';

export const SearchPage = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialQ = queryParams.get('q') || '';

  const [q, setQ] = useState(initialQ);
  const [role, setRole] = useState('');
  const [sport, setSport] = useState('');
  const [locFilter, setLocFilter] = useState('');
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);

  const debounceTimerRef = useRef(null);

  const roles = [
    { value: '', label: 'All Roles' },
    { value: 'PLAYER', label: 'Player' },
    { value: 'COACH', label: 'Coach' },
    { value: 'CLUB', label: 'Club' },
    { value: 'ASSOCIATION', label: 'Association' },
    { value: 'SPONSOR', label: 'Sponsor' },
    { value: 'SCOUT', label: 'Scout' },
  ];

  const performSearch = async (queryVal = q, roleVal = role, sportVal = sport, locVal = locFilter) => {
    setLoading(true);
    try {
      const res = await exploreAPI.search({
        q: queryVal,
        role: roleVal,
        sport: sportVal,
        location: locVal,
      });
      setUsers(res.data.users || []);
      setPosts(res.data.posts || []);
    } catch (err) {
      console.error('Search error', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search on query / filter change
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      performSearch(q, role, sport, locFilter);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [q, role, sport, locFilter]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    performSearch(q, role, sport, locFilter);
  };

  return (
    <div className="search-container">
      {/* Search Header & Filter Bar */}
      <div className="glass-panel search-header-panel">
        <h2 className="search-page-title">
          Search & Discovery
        </h2>
        <form onSubmit={handleSubmit} className="search-form-wrap">
          <div className="search-input-row">
            <div className="search-bar-inner">
              <input
                type="text"
                placeholder="Search athletes, coaches, clubs, sports..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="search-main-input"
              />
              <div className="search-actions-right">
                {q && (
                  <button
                    type="button"
                    onClick={() => setQ('')}
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
            <button type="submit" className="btn btn-primary search-submit-btn">
              Search
            </button>
          </div>

          {/* Filter Options */}
          <div className="search-filters-row">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="search-filter-select"
            >
              {roles.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Filter by sport..."
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="search-filter-input"
            />

            <input
              type="text"
              placeholder="Filter by city/country..."
              value={locFilter}
              onChange={(e) => setLocFilter(e.target.value)}
              className="search-filter-input"
            />
          </div>
        </form>
      </div>

      {/* Matching Athletes / Users */}
      {users.length > 0 && (
        <section className="search-section">
          <h3 className="search-section-title">
            Athletes & Organizations ({users.length})
          </h3>
          <div className="search-users-grid">
            {users.map((u) => {
              const avatarUrl = u.profile_picture ? getMediaUrl(u.profile_picture) : null;
              return (
                <Link
                  key={u.id}
                  to={`/profile/${u.username}`}
                  className="search-user-card glass-panel"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={u.username} className="search-user-avatar" />
                  ) : (
                    <div className="search-user-avatar-placeholder">
                      {u.username ? u.username.slice(0, 2).toUpperCase() : 'U'}
                    </div>
                  )}
                  <div className="search-user-name">
                    {u.username}
                    {u.is_verified && (
                      <svg className="verified-badge-sm" viewBox="0 0 24 24" width="14" height="14" fill="var(--accent)">
                        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    )}
                  </div>
                  <div className="search-user-role">
                    {u.role}
                  </div>
                  <div className="search-user-meta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {u.sport && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <TrophyIcon size={12} /> {u.sport}
                      </span>
                    )}
                    {u.location && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <MapPinIcon size={12} /> {u.location}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Matching Posts Grid */}
      <section className="search-section">
        <h3 className="search-section-title">
          Posts ({posts.length})
        </h3>
        {loading ? (
          <div className="search-loading">Searching SportsSphere...</div>
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
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Post thumbnail"
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
                    <div className="explore-grid-text-tile">
                      <div className="explore-text-tile-icon">
                        <FeedIcon size={24} />
                      </div>
                      <span className="explore-text-tile-author">
                        @{post.author?.username || 'athlete'}
                      </span>
                    </div>
                  )}

                  {videoUrl && (
                    <div className="explore-tile-video-badge">
                      <VideoIcon size={14} />
                    </div>
                  )}

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
        ) : users.length === 0 ? (
          <div className="glass-panel search-empty-card">
            <SearchIcon size={44} className="empty-icon" />
            <p>No matching athletes or posts found for "{q}".</p>
            <span>Try searching by sport name, role, or location.</span>
          </div>
        ) : null}
      </section>

      {/* Post Modal */}
      <PostDetailModal
        post={selectedPost}
        isOpen={Boolean(selectedPost)}
        onClose={() => setSelectedPost(null)}
        onPostDeleted={(id) => {
          setPosts((prev) => prev.filter((p) => p.id !== id));
          setSelectedPost(null);
        }}
        onPostUpdated={(updated) => {
          setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          setSelectedPost(updated);
        }}
      />
    </div>
  );
};
