import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { postsAPI, getMediaUrl } from '../../services/api';
import { CameraIcon, VideoIcon, CloseIcon } from '../common/Icons';

export const CreatePostModal = ({ isOpen, onClose, onPostCreated }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setVideoFile(null);
      setVideoPreview(null);
    }
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const removeMedia = () => {
    setImageFile(null);
    setImagePreview(null);
    setVideoFile(null);
    setVideoPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !imageFile && !videoFile) return;

    setIsSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      if (content.trim()) formData.append('content', content.trim());
      if (imageFile) formData.append('image', imageFile);
      if (videoFile) formData.append('video', videoFile);

      const res = await postsAPI.createPost(formData);
      setContent('');
      removeMedia();
      onClose();

      if (onPostCreated) {
        onPostCreated(res.data);
      } else {
        navigate('/feed');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const avatarUrl = user?.profile?.profile_picture ? getMediaUrl(user.profile.profile_picture) : null;

  return (
    <div className="mobile-modal-overlay" onClick={onClose}>
      <div className="mobile-modal-sheet glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="mobile-sheet-header">
          <div className="mobile-sheet-handle"></div>
          <div className="mobile-sheet-title-row">
            <h3 className="mobile-sheet-title">Create New Post</h3>
            <button type="button" className="mobile-sheet-close" onClick={onClose} aria-label="Close">
              <CloseIcon size={20} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mobile-modal-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mobile-post-form">
          <div className="mobile-post-user-row">
            {avatarUrl ? (
              <img src={avatarUrl} alt={user?.username} className="avatar-img-sm" />
            ) : (
              <div className="avatar-placeholder-sm">
                {user?.username ? user.username.slice(0, 2).toUpperCase() : 'U'}
              </div>
            )}
            <div className="mobile-post-user-meta">
              <span className="mobile-post-username">{user?.username}</span>
              <span className="mobile-post-role">{user?.role}</span>
            </div>
          </div>

          <textarea
            rows={4}
            placeholder="Share your highlights, training milestones, or thoughts..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="mobile-post-textarea"
            autoFocus
          />

          {imagePreview && (
            <div className="mobile-media-preview-box">
              <img src={imagePreview} alt="Preview" className="mobile-media-preview-img" />
              <button type="button" onClick={removeMedia} className="mobile-media-remove-btn" title="Remove image">
                <CloseIcon size={16} />
              </button>
            </div>
          )}

          {videoPreview && (
            <div className="mobile-media-preview-box">
              <video src={videoPreview} controls className="mobile-media-preview-video" />
              <button type="button" onClick={removeMedia} className="mobile-media-remove-btn" title="Remove video">
                <CloseIcon size={16} />
              </button>
            </div>
          )}

          <div className="mobile-post-tools">
            <div className="mobile-post-attachment-btns">
              <label className="mobile-attach-btn">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
                <CameraIcon size={18} /> Photo
              </label>

              <label className="mobile-attach-btn">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  style={{ display: 'none' }}
                />
                <VideoIcon size={18} /> Video
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || (!content.trim() && !imageFile && !videoFile)}
              className="btn btn-primary mobile-post-submit-btn"
            >
              {isSubmitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
