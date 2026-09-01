import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postsAPI } from '../services/api';
import { PostCard } from '../components/PostCard';
import { BookmarkIcon, FeedIcon } from '../components/common/Icons';

export const SavedPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSavedPosts = async () => {
    setLoading(true);
    try {
      const res = await postsAPI.getPosts({ saved: 'true' });
      setSavedPosts(res.data || []);
    } catch (err) {
      console.error('Failed to load saved posts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedPosts();
  }, []);

  const handlePostDeleted = (postId) => {
    setSavedPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handlePostUpdated = (updatedPost) => {
    // If the post was unsaved, remove it from the saved list
    if (updatedPost.is_saved === false) {
      setSavedPosts((prev) => prev.filter((p) => p.id !== updatedPost.id));
    } else {
      setSavedPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
    }
  };

  return (
    <div className="saved-page-container" style={{ maxWidth: '680px', margin: '0 auto', padding: '16px' }}>
      {/* Page Header */}
      <div className="saved-page-header glass-panel" style={{ padding: '18px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--accent-bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BookmarkIcon size={22} color="var(--accent)" fill="var(--accent)" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
            Saved Reels & Posts
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
            All your bookmarked highlight clips, drills, and athlete updates
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="reels-spinner" style={{ margin: '0 auto 12px auto' }}></div>
          <span>Loading saved posts...</span>
        </div>
      ) : savedPosts.length > 0 ? (
        /* Posts Stream */
        <div className="saved-posts-stream" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {savedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onPostDeleted={handlePostDeleted}
              onPostUpdated={handlePostUpdated}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="glass-panel saved-empty-state" style={{ padding: '48px 24px', textAlign: 'center', borderRadius: '20px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-subtle-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <BookmarkIcon size={32} color="var(--accent)" />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
            No Saved Posts
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: '340px', margin: '0 auto 20px auto', lineHeight: '1.5' }}>
            You haven't saved any reels or posts yet. Tap the bookmark icon on any post in your feed to save it here.
          </p>
          <Link to="/feed" className="btn btn-primary btn-sm" style={{ padding: '10px 22px', fontSize: '0.88rem', fontWeight: '700' }}>
            Explore Reels Feed
          </Link>
        </div>
      )}
    </div>
  );
};
