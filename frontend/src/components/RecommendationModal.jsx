import React, { useState } from 'react';
import { profilesAPI } from '../services/api';
import { CloseIcon, RecommendationIcon } from './common/Icons';

export const RecommendationModal = ({ isOpen, onClose, playerId, playerName, onRecommendationAdded }) => {
  const [relationship, setRelationship] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const res = await profilesAPI.addRecommendation(playerId, { relationship, content });
      if (onRecommendationAdded) onRecommendationAdded(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit recommendation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <button className="admin-modal-close" onClick={onClose} aria-label="Close">
          <CloseIcon size={20} />
        </button>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RecommendationIcon size={20} /> Write Recommendation
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Provide professional testimonial for <strong>{playerName}</strong>.
        </p>

        {error && <div style={{ color: '#ff5252', marginBottom: '10px', fontSize: '0.85rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Your Relationship to Player
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Head Coach, Academy Director"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="form-input"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Recommendation
            </label>
            <textarea
              rows={4}
              required
              placeholder="Describe player's work ethic, technical ability, discipline, and potential..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="form-textarea"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-sm">
              {isSubmitting ? 'Submitting...' : 'Submit Recommendation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
