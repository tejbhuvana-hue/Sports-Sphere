import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { postsAPI } from '../services/api';
import { PostCard } from '../components/PostCard';
import { StoryBar } from '../components/stories/StoryBar';
import { FeedIcon } from '../components/common/Icons';

export const HomePage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHomePosts = async () => {
    setLoading(true);
    try {
      const res = await postsAPI.getPosts();
      // Filter out current user's own posts
      const othersPosts = (res.data || []).filter(
        (p) => p.author?.username !== user?.username && p.author?.id !== user?.id && !p.is_author
      );
      // Randomize / shuffle others' posts
      const shuffled = [...othersPosts].sort(() => 0.5 - Math.random());
      setPosts(shuffled);
    } catch (err) {
      console.error('Failed to load home feed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomePosts();
  }, [user]);

  const handlePostDeleted = (postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId && p.original_id !== postId));
  };

  const handlePostUpdated = (updatedPost) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === updatedPost.id || p.original_id === updatedPost.id ? updatedPost : p))
    );
  };

  return (
    <div className="home-dashboard-container">
      {/* 1. TOP STORIES SECTION */}
      <StoryBar />

      {/* 2. OTHERS' POSTS STREAM (Randomized, No Heading, No Full Feed Link) */}
      <div className="home-feed-stream" style={{ marginTop: '16px' }}>
        {loading ? (
          <div className="feed-loading-state">
            Loading sports feed...
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
            <h3 className="empty-title">No Posts Yet</h3>
            <p className="empty-desc">
              When other athletes and coaches share highlights and updates, they will appear here!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
