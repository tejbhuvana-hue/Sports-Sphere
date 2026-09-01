import React, { useState } from 'react';
import { profilesAPI } from '../services/api';
import { CloseIcon, BriefcaseIcon, AwardIcon, CertificateIcon, StatsIcon } from './common/Icons';

export const AddExperienceModal = ({ isOpen, onClose, onItemAdded }) => {
  const [formData, setFormData] = useState({
    role: '',
    club_name: '',
    start_date: '',
    end_date: '',
    is_current: false,
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const res = await profilesAPI.addResumeItem('experience', formData);
      onItemAdded(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add experience.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <button className="admin-modal-close" onClick={onClose} aria-label="Close">
          <CloseIcon size={20} />
        </button>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BriefcaseIcon size={20} /> Add Career Experience
        </h3>
        {error && <div style={{ color: '#ff5252', marginBottom: '10px', fontSize: '0.85rem' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Role / Position</label>
            <input
              type="text"
              required
              placeholder="e.g. Center Forward, Team Captain"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Club / Organization</label>
            <input
              type="text"
              required
              placeholder="e.g. Real Athletic FC"
              value={formData.club_name}
              onChange={(e) => setFormData({ ...formData, club_name: e.target.value })}
              className="form-input"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Start Date</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>End Date</label>
              <input
                type="date"
                disabled={formData.is_current}
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="form-input"
              />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.is_current}
              onChange={(e) => setFormData({ ...formData, is_current: e.target.checked, end_date: e.target.checked ? '' : formData.end_date })}
            />
            Currently playing / working here
          </label>
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Description (Optional)</label>
            <textarea
              rows={3}
              placeholder="Responsibilities, highlights, match stats..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="form-textarea"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-sm">
              {isSubmitting ? 'Adding...' : 'Add Experience'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const AddAchievementModal = ({ isOpen, onClose, onItemAdded }) => {
  const [formData, setFormData] = useState({ title: '', year: new Date().getFullYear(), description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const res = await profilesAPI.addResumeItem('achievement', formData);
      onItemAdded(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add achievement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
        <button className="admin-modal-close" onClick={onClose} aria-label="Close">
          <CloseIcon size={20} />
        </button>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AwardIcon size={20} /> Add Achievement
        </h3>
        {error && <div style={{ color: '#ff5252', marginBottom: '10px', fontSize: '0.85rem' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Title</label>
            <input
              type="text"
              required
              placeholder="e.g. State Championship MVP, Golden Boot"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Year</label>
            <input
              type="number"
              required
              min="1990"
              max="2099"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Description (Optional)</label>
            <textarea
              rows={3}
              placeholder="Context, opponent, tournament name..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="form-textarea"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-sm">
              {isSubmitting ? 'Saving...' : 'Save Achievement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const AddCertificateModal = ({ isOpen, onClose, onItemAdded }) => {
  const [formData, setFormData] = useState({ name: '', authority: '', issue_date: '', credential_id: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const res = await profilesAPI.addResumeItem('certificate', formData);
      onItemAdded(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add certification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
        <button className="admin-modal-close" onClick={onClose} aria-label="Close">
          <CloseIcon size={20} />
        </button>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CertificateIcon size={20} /> Add Certification
        </h3>
        {error && <div style={{ color: '#ff5252', marginBottom: '10px', fontSize: '0.85rem' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Certificate / License Name</label>
            <input
              type="text"
              required
              placeholder="e.g. FIFA Youth Coaching License, CPR Certified"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Issuing Authority</label>
            <input
              type="text"
              required
              placeholder="e.g. USSF, UEFA, National Red Cross"
              value={formData.authority}
              onChange={(e) => setFormData({ ...formData, authority: e.target.value })}
              className="form-input"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Issue Date</label>
              <input
                type="date"
                required
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Credential ID (Optional)</label>
              <input
                type="text"
                placeholder="e.g. LIC-88219"
                value={formData.credential_id}
                onChange={(e) => setFormData({ ...formData, credential_id: e.target.value })}
                className="form-input"
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-sm">
              {isSubmitting ? 'Saving...' : 'Save Certification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const AddStatisticModal = ({ isOpen, onClose, onItemAdded }) => {
  const [formData, setFormData] = useState({ name: '', value: '', season: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const res = await profilesAPI.addResumeItem('statistic', formData);
      onItemAdded(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add statistic.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <button className="admin-modal-close" onClick={onClose} aria-label="Close">
          <CloseIcon size={20} />
        </button>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StatsIcon size={20} /> Add Performance Metric
        </h3>
        {error && <div style={{ color: '#ff5252', marginBottom: '10px', fontSize: '0.85rem' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Metric Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Goals Scored, Pass Accuracy, 100m Sprint"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-input"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Value</label>
              <input
                type="text"
                required
                placeholder="e.g. 24, 89.4%, 10.42s"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Season / Year (Optional)</label>
              <input
                type="text"
                placeholder="e.g. 2025/2026"
                value={formData.season}
                onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                className="form-input"
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-sm">
              {isSubmitting ? 'Saving...' : 'Save Metric'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
