import React, { useState, useRef } from 'react';
import { storiesAPI } from '../../services/api';
import { CameraIcon, VideoIcon, TypeIcon, CloseIcon, PlusIcon } from '../common/Icons';

const GRADIENT_PRESETS = [
  { id: 'emerald', name: 'Emerald', value: 'linear-gradient(135deg, #10b981 0%, #064e3b 100%)' },
  { id: 'cyber', name: 'Cyber Blue', value: 'linear-gradient(135deg, #0ea5e9 0%, #1e3a8a 100%)' },
  { id: 'violet', name: 'Electric Violet', value: 'linear-gradient(135deg, #8b5cf6 0%, #4c1d95 100%)' },
  { id: 'sunset', name: 'Sunset Amber', value: 'linear-gradient(135deg, #f59e0b 0%, #7c2d12 100%)' },
  { id: 'carbon', name: 'Carbon Dark', value: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' },
  { id: 'crimson', name: 'Velocity Crimson', value: 'linear-gradient(135deg, #ef4444 0%, #881337 100%)' },
];

export const StoryCreatorModal = ({ isOpen, onClose, onStoryCreated }) => {
  const [activeTab, setActiveTab] = useState('TEXT'); // 'IMAGE' | 'VIDEO' | 'TEXT'
  const [textContent, setTextContent] = useState('');
  const [bgStyle, setBgStyle] = useState(GRADIENT_PRESETS[0].value);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setTextContent('');
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCaption('');
    setError('');
    setIsSubmitting(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    handleReset();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 50MB for video, 15MB for image)
    const maxMb = activeTab === 'VIDEO' ? 50 : 15;
    if (file.size > maxMb * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${maxMb}MB.`);
      return;
    }

    setError('');
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');

    // Validation
    if (activeTab === 'TEXT' && !textContent.trim()) {
      setError('Please write some text for your story.');
      return;
    }
    if ((activeTab === 'IMAGE' || activeTab === 'VIDEO') && !selectedFile) {
      setError(`Please select a ${activeTab.toLowerCase()} file.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('story_type', activeTab);

      if (activeTab === 'TEXT') {
        formData.append('text_content', textContent.trim());
        formData.append('background_style', bgStyle);
      } else {
        formData.append('media', selectedFile);
        if (caption.trim()) {
          formData.append('text_content', caption.trim());
        }
      }

      const res = await storiesAPI.createStory(formData);
      handleReset();
      if (onStoryCreated) {
        onStoryCreated(res.data);
      }
      onClose();
    } catch (err) {
      console.error('Failed to publish story', err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.response?.data?.message ||
        (err.message ? `Upload failed: ${err.message}` : 'Failed to upload story. Please check your connection and try again.');
      setError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="story-modal-backdrop" onClick={handleClose}>
      <div
        className="story-creator-modal glass-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Create Story"
      >
        {/* Modal Header */}
        <div className="story-creator-header">
          <h3 className="story-creator-title">Share a 24h Story</h3>
          <button
            type="button"
            className="story-btn-icon"
            onClick={handleClose}
            aria-label="Close story creator"
            disabled={isSubmitting}
          >
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Story Type Selector Tabs */}
        <div className="story-type-tabs">
          <button
            type="button"
            className={`story-type-tab ${activeTab === 'TEXT' ? 'active' : ''}`}
            onClick={() => handleTabChange('TEXT')}
          >
            <TypeIcon size={16} /> Text
          </button>
          <button
            type="button"
            className={`story-type-tab ${activeTab === 'IMAGE' ? 'active' : ''}`}
            onClick={() => handleTabChange('IMAGE')}
          >
            <CameraIcon size={16} /> Photo
          </button>
          <button
            type="button"
            className={`story-type-tab ${activeTab === 'VIDEO' ? 'active' : ''}`}
            onClick={() => handleTabChange('VIDEO')}
          >
            <VideoIcon size={16} /> Video
          </button>
        </div>

        {/* Story Creator Body / Canvas */}
        <form onSubmit={handleSubmit} className="story-creator-form">
          {error && <div className="alert-box alert-danger">{error}</div>}

          {/* Canvas Preview Area */}
          <div className="story-canvas-preview-container">
            {activeTab === 'TEXT' && (
              <div
                className="story-text-canvas"
                style={{ background: bgStyle }}
              >
                <textarea
                  className="story-text-canvas-input"
                  placeholder="Type your story here... Share match highlights, training updates, or motivational thoughts!"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  maxLength={300}
                  autoFocus
                />
                <div className="story-canvas-char-count">{textContent.length}/300</div>
              </div>
            )}

            {activeTab === 'IMAGE' && (
              <div className="story-media-canvas">
                {previewUrl ? (
                  <div className="story-preview-media-box">
                    <img src={previewUrl} alt="Story Preview" className="story-preview-img" />
                    <button
                      type="button"
                      className="story-remove-media-btn"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      title="Change photo"
                    >
                      <CloseIcon size={16} />
                    </button>
                  </div>
                ) : (
                  <div
                    className="story-upload-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <CameraIcon size={40} className="story-dropzone-icon" />
                    <span>Click or tap to select a photo</span>
                    <span className="story-dropzone-sub">JPG, PNG, WebP up to 15MB</span>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>
            )}

            {activeTab === 'VIDEO' && (
              <div className="story-media-canvas">
                {previewUrl ? (
                  <div className="story-preview-media-box">
                    <video
                      src={previewUrl}
                      controls
                      autoPlay
                      muted
                      className="story-preview-video"
                    />
                    <button
                      type="button"
                      className="story-remove-media-btn"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      title="Change video"
                    >
                      <CloseIcon size={16} />
                    </button>
                  </div>
                ) : (
                  <div
                    className="story-upload-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <VideoIcon size={40} className="story-dropzone-icon" />
                    <span>Click or tap to select a video clip</span>
                    <span className="story-dropzone-sub">MP4, WebM, MOV up to 50MB</span>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="video/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>
            )}
          </div>

          {/* Controls below canvas */}
          {activeTab === 'TEXT' && (
            <div className="story-creator-color-picker">
              <span className="story-picker-label">Background Theme:</span>
              <div className="story-palette-options">
                {GRADIENT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`story-palette-btn ${bgStyle === preset.value ? 'selected' : ''}`}
                    style={{ background: preset.value }}
                    onClick={() => setBgStyle(preset.value)}
                    title={preset.name}
                    aria-label={`Select ${preset.name} background`}
                  />
                ))}
              </div>
            </div>
          )}

          {(activeTab === 'IMAGE' || activeTab === 'VIDEO') && selectedFile && (
            <div className="story-caption-input-box">
              <input
                type="text"
                placeholder="Add a caption (optional)..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={150}
                className="story-caption-input"
              />
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="story-creator-footer">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={
                isSubmitting ||
                (activeTab === 'TEXT' && !textContent.trim()) ||
                ((activeTab === 'IMAGE' || activeTab === 'VIDEO') && !selectedFile)
              }
            >
              {isSubmitting ? 'Publishing Story...' : 'Share to Story'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
