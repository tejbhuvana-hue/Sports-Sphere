import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { exploreAPI, getMediaUrl } from '../services/api';
import { PostCard } from '../components/PostCard';
import { SearchIcon, CloseIcon } from '../components/common/Icons';

export const ExplorePage = () => {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
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

  return (
    <div className="explore-container">
      {/* Search Header */}
      <div className="glass-panel explore-search-panel">
        <h2 className="explore-page-title">Explore SportsSphere</h2>
        <div className="explore-search-bar">
          <span className="search-icon-decor" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center' }}>
            <SearchIcon size={18} />
          </span>
          <input
            type="text"
            placeholder="Search athletes, coaches, sports, or topics..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="explore-search-input"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="search-clear-btn"
              aria-label="Clear search"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <CloseIcon size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Athletes & People Grid */}
      {users.length > 0 && (
        <section className="explore-section">
          <h3 className="explore-section-title">People & Profiles</h3>
          <div className="explore-users-grid">
            {users.map((u) => {
              const avatarUrl = u.profile_picture ? getMediaUrl(u.profile_picture) : null;
              return (
                <Link
                  key={u.id}
                  to={`/profile/${u.username}`}
                  className="glass-panel explore-user-card"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={u.username} className="explore-user-avatar" />
                  ) : (
                    <div className="explore-user-avatar-placeholder">
                      {u.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="explore-user-name">
                    {u.username}
                    {u.is_verified && (
                      <svg className="verified-badge-sm" viewBox="0 0 24 24" width="14" height="14" fill="var(--accent)">
                        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    )}
                  </div>
                  <div className="explore-user-role">
                    {u.role} {u.sport ? `• ${u.sport}` : ''}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Featured Posts */}
      <section className="explore-section">
        <h3 className="explore-section-title">Trending & Recent Posts</h3>
        {loading ? (
          <div className="explore-loading">Loading explore feed...</div>
        ) : posts.length > 0 ? (
          <div className="explore-posts-stream">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="glass-panel explore-empty-card">
            No posts found for "{query}".
          </div>
        )}
      </section>
    </div>
  );
};
