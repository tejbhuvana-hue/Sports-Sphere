import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postsAPI, getMediaUrl } from '../services/api';
import { PencilIcon, TrashIcon, CloseIcon, PaperPlaneIcon } from './common/Icons';
import { SharePostModal } from './SharePostModal';

export const PostCard = ({ post, onPostDeleted, onPostUpdated }) => {
  const { user, isAuthenticated } = useAuth();
  const [liked, setLiked] = useState(post.is_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [saved, setSaved] = useState(post.is_saved);
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [comments, setComments] = useState(post.comments || []);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content || '');

  const handleLikeToggle = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await postsAPI.toggleLike(post.id);
      setLiked(res.data.liked);
      setLikesCount(res.data.likes_count);
    } catch (err) {
      console.error('Like toggle error', err);
    }
  };

  const handleSaveToggle = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await postsAPI.toggleSave(post.id);
      setSaved(res.data.saved);
    } catch (err) {
      console.error('Save toggle error', err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const res = await postsAPI.createComment(post.id, { content: newComment.trim() });
      setComments((prev) => [...prev, res.data]);
      setNewComment('');
    } catch (err) {
      console.error('Comment submission error', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await postsAPI.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error('Comment deletion error', err);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await postsAPI.deletePost(post.id);
      if (onPostDeleted) onPostDeleted(post.id);
    } catch (err) {
      console.error('Post deletion error', err);
    }
  };

  const handleUpdatePost = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('content', editContent);
      const res = await postsAPI.updatePost(post.id, formData);
      setIsEditing(false);
      if (onPostUpdated) onPostUpdated(res.data);
    } catch (err) {
      console.error('Post update error', err);
    }
  };

  const author = post.author || {};
  const avatarUrl = author.profile_picture ? getMediaUrl(author.profile_picture) : null;
  const imageUrl = post.image ? getMediaUrl(post.image) : null;
  const videoUrl = post.video ? getMediaUrl(post.video) : null;
  const isAuthor = post.is_author;

  return (
    <article className="post-card glass-panel" style={{ marginBottom: '20px', padding: '20px' }}>
      {/* Post Header */}
      <div className="post-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <Link to={`/profile/${author.username}`} className="post-author" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'inherit' }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={author.username} className="avatar" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div className="avatar" style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'var(--accent)',
              color: 'var(--btn-primary-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '0.9rem'
            }}>
              {author.username ? author.username.slice(0, 2).toUpperCase() : 'U'}
            </div>
          )}
          <div>
            <div style={{ fontWeight: '700', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {author.username}
              {author.is_verified && (
                <svg className="verified-badge" viewBox="0 0 24 24" width="14" height="14" fill="var(--accent)">
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              )}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {author.role} • {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </div>
          </div>
        </Link>

        {isAuthor && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setIsEditing(!isEditing)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: '4px' }}
              title="Edit Post"
            >
              <PencilIcon size={16} />
            </button>
            <button
              onClick={handleDeletePost}
              style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', display: 'flex', padding: '4px' }}
              title="Delete Post"
            >
              <TrashIcon size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Edit Form or Post Content */}
      {isEditing ? (
        <form onSubmit={handleUpdatePost} style={{ marginBottom: '14px' }}>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid var(--input-border)',
              background: 'var(--input-bg)',
              color: 'var(--text-primary)',
              marginBottom: '10px',
              outline: 'none'
            }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="btn btn-primary btn-sm">Save Changes</button>
            <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary btn-sm">Cancel</button>
          </div>
        </form>
      ) : (
        post.content && (
          <p className="post-content" style={{ fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '14px', whiteSpace: 'pre-line' }}>
            {post.content}
          </p>
        )
      )}

      {/* Media Attachments */}
      {imageUrl && (
        <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '14px' }}>
          <img src={imageUrl} alt="Post Attachment" style={{ width: '100%', maxHeight: '500px', objectFit: 'cover', display: 'block' }} />
        </div>
      )}

      {videoUrl && (
        <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '14px' }}>
          <video controls style={{ width: '100%', maxHeight: '500px', display: 'block' }}>
            <source src={videoUrl} />
            Your browser does not support HTML video.
          </video>
        </div>
      )}

      {/* Post Actions Bar */}
      <div className="post-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={handleLikeToggle}
            className="action-btn"
            style={{
              background: 'transparent',
              border: 'none',
              color: liked ? '#ff4d4d' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill={liked ? '#ff4d4d' : 'none'} stroke={liked ? '#ff4d4d' : 'currentColor'} strokeWidth="2">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span>{likesCount}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="action-btn"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>{comments.length}</span>
          </button>

          <button
            onClick={() => setShowShareModal(true)}
            className="action-btn"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}
            title="Share via Direct Message"
          >
            <PaperPlaneIcon size={18} />
          </button>
        </div>

        <button
          onClick={handleSaveToggle}
          style={{
            background: 'transparent',
            border: 'none',
            color: saved ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.85rem'
          }}
          title={saved ? 'Saved' : 'Save Post'}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill={saved ? 'var(--accent)' : 'none'} stroke={saved ? 'var(--accent)' : 'currentColor'} strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
          <span>{saved ? 'Saved' : 'Save'}</span>
        </button>
      </div>

      <SharePostModal
        post={post}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />

      {/* Comments Section */}
      {showComments && (
        <div className="comments-section" style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
          {isAuthenticated && (
            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <input
                type="text"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 14px',
                  borderRadius: '20px',
                  border: '1px solid var(--input-border)',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isSubmittingComment}
                className="btn btn-primary btn-sm"
                style={{ borderRadius: '20px', opacity: !newComment.trim() ? 0.6 : 1 }}
              >
                Send
              </button>
            </form>
          )}

          <div className="comments-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {comments.map((c) => {
              const commentAuthor = c.author || {};
              const commentAvatarUrl = commentAuthor.profile_picture ? getMediaUrl(commentAuthor.profile_picture) : null;
              const canDelete = c.is_author || (user && (user.id === commentAuthor.id || user.is_superuser));

              return (
                <div key={c.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  {commentAvatarUrl ? (
                    <img src={commentAvatarUrl} alt={commentAuthor.username} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '700' }}>
                      {commentAuthor.username ? commentAuthor.username.slice(0, 2).toUpperCase() : 'U'}
                    </div>
                  )}
                  <div style={{ flex: 1, background: 'var(--bg-subtle-2)', padding: '8px 12px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <Link to={`/profile/${commentAuthor.username}`} style={{ fontWeight: '700', fontSize: '0.82rem', color: 'var(--text-primary)', textDecoration: 'none' }}>
                        {commentAuthor.username}
                      </Link>
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
                          title="Delete Comment"
                        >
                          <CloseIcon size={14} />
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{c.content}</div>
                  </div>
                </div>
              );
            })}
            {comments.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem', padding: '6px 0' }}>
                No comments yet. Be the first to comment!
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
};
