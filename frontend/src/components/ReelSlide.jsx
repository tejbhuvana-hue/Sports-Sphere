import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postsAPI, followsAPI, getMediaUrl } from '../services/api';
import { CheckVerifiedIcon, CloseIcon, PencilIcon, TrashIcon, UserIcon, PaperPlaneIcon, BookmarkIcon } from './common/Icons';
import { SharePostModal } from './SharePostModal';

export const ReelSlide = ({ post, isActive, onPostDeleted, onPostUpdated }) => {
  const { user, isAuthenticated } = useAuth();

  const [liked, setLiked] = useState(post.is_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [saved, setSaved] = useState(post.is_saved);
  const [comments, setComments] = useState(post.comments || []);
  const [showCommentsDrawer, setShowCommentsDrawer] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isFollowing, setIsFollowing] = useState(post.author?.is_following || false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [captionExpanded, setCaptionExpanded] = useState(false);

  const videoRef = useRef(null);

  const author = post.author || {};
  const avatarUrl = author.profile_picture ? getMediaUrl(author.profile_picture) : null;
  const imageUrl = post.image ? getMediaUrl(post.image) : null;
  const videoUrl = post.video ? getMediaUrl(post.video) : null;
  const isAuthor = post.is_author || user?.username === author.username;

  // Autoplay / pause video based on active reel visibility
  useEffect(() => {
    if (videoRef.current) {
      if (isActive && isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isActive, isPlaying]);

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

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

  const handleFollowToggle = async () => {
    if (!isAuthenticated || !author.id) return;
    try {
      await followsAPI.toggleFollow(author.id);
      setIsFollowing(!isFollowing);
    } catch (err) {
      console.error('Follow toggle error', err);
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

  return (
    <div className="reel-slide" id={`post-${post.id}`}>
      {/* 1. FULL-SCREEN MEDIA CANVAS (Video, Photo/Image, or Stylized Poster) */}
      <div className="reel-media-container" onClick={videoUrl ? togglePlayPause : undefined}>
        {videoUrl ? (
          <div className="reel-video-wrapper">
            <video
              ref={videoRef}
              src={videoUrl}
              className="reel-video"
              loop
              muted={isMuted}
              playsInline
            />
            {/* Audio Toggle Button */}
            <button
              type="button"
              onClick={toggleMute}
              className="reel-sound-btn"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              )}
            </button>

            {!isPlaying && (
              <div className="reel-play-indicator">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="#ffffff">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
            )}
          </div>
        ) : imageUrl ? (
          <div className="reel-image-wrapper">
            <div className="reel-image-ambient" style={{ backgroundImage: `url(${imageUrl})` }}></div>
            <img src={imageUrl} alt="Reel media" className="reel-image" />
          </div>
        ) : (
          <div className="reel-text-poster">
            <div className="reel-poster-backdrop"></div>
            <div className="reel-poster-content">
              <div className="reel-quote-badge">“</div>
              <p className="reel-poster-text">{post.content}</p>
            </div>
          </div>
        )}

        {/* Ambient Dark Gradient for crisp readability of captions and text */}
        <div className="reel-gradient-overlay"></div>
      </div>

      {/* 2. PROMINENT BOTTOM-LEFT AUTHOR INFO & POST CONTENT CAPTION */}
      <div className="reel-overlay-bottom">
        <div className="reel-author-row">
          <Link to={`/profile/${author.username}`} className="reel-author-link">
            {avatarUrl ? (
              <img src={avatarUrl} alt={author.username} className="reel-author-avatar" />
            ) : (
              <div className="reel-author-avatar-placeholder">
                {author.username ? author.username.slice(0, 2).toUpperCase() : 'U'}
              </div>
            )}
            <div className="reel-author-names">
              <span className="reel-author-username">
                {author.username}
                {author.is_verified && <CheckVerifiedIcon size={13} />}
              </span>
              {author.role && (
                <span className="reel-author-role">
                  {author.role} {author.sport ? `• ${author.sport}` : ''}
                </span>
              )}
            </div>
          </Link>

          {!isAuthor && isAuthenticated && (
            <button
              type="button"
              onClick={handleFollowToggle}
              className={`reel-follow-btn ${isFollowing ? 'following' : ''}`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>

        {/* Post Content / Caption (Prominently displayed directly on screen) */}
        {post.content && (
          <div className="reel-caption-wrap">
            <p className={`reel-caption-text ${captionExpanded ? 'expanded' : ''}`}>
              {post.content}
            </p>
            {post.content.length > 90 && (
              <button
                type="button"
                className="reel-caption-more-btn"
                onClick={() => setCaptionExpanded(!captionExpanded)}
              >
                {captionExpanded ? 'less' : 'more'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. RIGHT-SIDE VERTICAL ACTION RAIL (Instagram Style) */}
      <div className="reel-action-rail">
        {/* Like */}
        <button
          type="button"
          onClick={handleLikeToggle}
          className={`reel-action-btn ${liked ? 'active-like' : ''}`}
          aria-label="Like"
        >
          <div className="reel-action-icon-circle">
            <svg viewBox="0 0 24 24" width="24" height="24" fill={liked ? '#ff3b5c' : 'none'} stroke={liked ? '#ff3b5c' : '#ffffff'} strokeWidth="2.2">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <span className="reel-action-count">{likesCount}</span>
        </button>

        {/* Comments */}
        <button
          type="button"
          onClick={() => setShowCommentsDrawer(true)}
          className="reel-action-btn"
          aria-label="Comments"
        >
          <div className="reel-action-icon-circle">
            <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="#ffffff" strokeWidth="2.2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span className="reel-action-count">{comments.length}</span>
        </button>

        {/* Paper Rocket / Direct Message Share */}
        <button
          type="button"
          onClick={() => setShowShareModal(true)}
          className="reel-action-btn"
          aria-label="Share via Messages"
          title="Share post via direct message"
        >
          <div className="reel-action-icon-circle">
            <PaperPlaneIcon size={22} color="#ffffff" />
          </div>
          <span className="reel-action-count">Share</span>
        </button>

        {/* Bookmark / Save Reel */}
        <button
          type="button"
          onClick={handleSaveToggle}
          className={`reel-action-btn ${saved ? 'active-save' : ''}`}
          aria-label="Save"
        >
          <div className="reel-action-icon-circle">
            <BookmarkIcon size={22} color={saved ? 'var(--accent)' : '#ffffff'} fill={saved ? 'var(--accent)' : 'none'} />
          </div>
          <span className="reel-action-count">{saved ? 'Saved' : 'Save'}</span>
        </button>
      </div>

      {/* 4. SHARE VIA DIRECT MESSAGES MODAL */}
      <SharePostModal
        post={post}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />

      {/* 5. IN-REEL COMMENTS BOTTOM SHEET */}
      {showCommentsDrawer && (
        <div className="reel-comments-overlay" onClick={() => setShowCommentsDrawer(false)}>
          <div className="reel-comments-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="reel-comments-header">
              <div className="reel-comments-handle"></div>
              <div className="reel-comments-title-row">
                <h4>Comments ({comments.length})</h4>
                <button
                  type="button"
                  className="reel-comments-close"
                  onClick={() => setShowCommentsDrawer(false)}
                >
                  <CloseIcon size={18} />
                </button>
              </div>
            </div>

            <div className="reel-comments-list">
              {comments.length > 0 ? (
                comments.map((c) => {
                  const cAvatar = c.author?.profile_picture ? getMediaUrl(c.author.profile_picture) : null;
                  const canDelete = isAuthor || (user && user.id === c.author?.id);
                  return (
                    <div key={c.id} className="reel-comment-item">
                      {cAvatar ? (
                        <img src={cAvatar} alt={c.author?.username} className="reel-comment-avatar" />
                      ) : (
                        <div className="reel-comment-avatar-placeholder">
                          {c.author?.username ? c.author.username.slice(0, 2).toUpperCase() : 'U'}
                        </div>
                      )}
                      <div className="reel-comment-body">
                        <div className="reel-comment-author-bar">
                          <Link to={`/profile/${c.author?.username}`} className="reel-comment-author-name">
                            {c.author?.username}
                          </Link>
                          <span className="reel-comment-time">
                            {new Date(c.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="reel-comment-text">{c.content}</p>
                      </div>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(c.id)}
                          className="reel-comment-delete-btn"
                          title="Delete comment"
                        >
                          <TrashIcon size={14} />
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="reel-no-comments">
                  No comments yet. Start the conversation!
                </div>
              )}
            </div>

            {/* Add Comment Input Bar */}
            {isAuthenticated ? (
              <form onSubmit={handleAddComment} className="reel-comment-form">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="reel-comment-input"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || isSubmittingComment}
                  className="reel-comment-submit-btn"
                >
                  Post
                </button>
              </form>
            ) : (
              <div className="reel-comment-login-prompt">
                <Link to="/login">Sign in</Link> to join the conversation.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

