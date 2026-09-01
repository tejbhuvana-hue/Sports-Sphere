import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { profilesAPI, getMediaUrl } from '../services/api';
import { CameraIcon, PencilIcon, ArrowLeftIcon, CloseIcon } from '../components/common/Icons';

export const ProfileEditPage = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    bio: '',
    location: '',
    sport: '',
    position: '',
    achievements: '',
    certifications: '',
    experience: '',
    club_info: '',
    org_info: '',
    company_name: '',
    company_website: '',
    company_industry: '',
    company_profile: '',
    recruitment_profile: '',
  });

  const [picFile, setPicFile] = useState(null);
  const [picPreview, setPicPreview] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      const p = user.profile || {};
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        bio: p.bio || '',
        location: p.location || '',
        sport: p.sport || '',
        position: p.position || '',
        achievements: p.achievements || '',
        certifications: p.certifications || '',
        experience: p.experience || '',
        club_info: p.club_info || '',
        org_info: p.org_info || '',
        company_name: p.company_name || '',
        company_website: p.company_website || '',
        company_industry: p.company_industry || '',
        company_profile: p.company_profile || '',
        recruitment_profile: p.recruitment_profile || '',
      });

      if (p.profile_picture) {
        setPicPreview(getMediaUrl(p.profile_picture));
      }
      if (p.cover_banner) {
        setBannerPreview(getMediaUrl(p.cover_banner));
      }
    }
  }, [user]);

  const handlePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPicFile(file);
      setPicPreview(URL.createObjectURL(file));
    }
  };

  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    setError('');

    try {
      const formPayload = new FormData();
      Object.keys(formData).forEach((k) => {
        formPayload.append(k, formData[k]);
      });
      if (picFile) formPayload.append('profile_picture', picFile);
      if (bannerFile) formPayload.append('cover_banner', bannerFile);

      await profilesAPI.updateProfile(formPayload);
      await refreshUser();
      setMessage('Profile updated successfully!');
      setTimeout(() => {
        navigate(`/profile/${user.username}`);
      }, 800);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="profile-edit-page-container">
      <div className="profile-edit-nav-back">
        <Link to={`/profile/${user?.username}`} className="profile-edit-back-link">
          <ArrowLeftIcon size={18} /> Back to Profile
        </Link>
      </div>

      <div className="glass-panel profile-edit-card">
        <div className="profile-edit-header">
          <h1 className="profile-edit-title">
            Edit Profile Information
          </h1>
          <p className="profile-edit-subtitle">
            Update your public sports persona, credentials, and media
          </p>
        </div>

        {message && (
          <div className="alert-box alert-success">
            {message}
          </div>
        )}

        {error && (
          <div className="alert-box alert-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="profile-edit-form">
          {/* Visual Media Uploads (Responsive Grid) */}
          <div className="edit-form-grid-2">
            <div className="edit-media-box">
              <label className="form-label">
                Profile Picture
              </label>
              <div className="edit-media-preview-wrap">
                {picPreview ? (
                  <img src={picPreview} alt="Profile preview" className="edit-avatar-preview" />
                ) : (
                  <div className="edit-avatar-placeholder">
                    {user?.username?.slice(0, 2).toUpperCase() || 'SP'}
                  </div>
                )}
                <label className="btn btn-secondary btn-sm edit-file-upload-btn">
                  <CameraIcon size={16} /> Choose Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePicChange}
                    className="hidden-file-input"
                  />
                </label>
              </div>
            </div>

            <div className="edit-media-box">
              <label className="form-label">
                Cover Banner
              </label>
              <div className="edit-banner-preview-wrap">
                {bannerPreview ? (
                  <img src={bannerPreview} alt="Banner preview" className="edit-banner-preview" />
                ) : (
                  <div className="edit-banner-placeholder">
                    No banner set
                  </div>
                )}
                <label className="btn btn-secondary btn-sm edit-file-upload-btn">
                  <CameraIcon size={16} /> Choose Banner
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerChange}
                    className="hidden-file-input"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Names */}
          <div className="edit-form-grid-2">
            <div>
              <label className="form-label">
                First Name
              </label>
              <input
                type="text"
                placeholder="First name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">
                Last Name
              </label>
              <input
                type="text"
                placeholder="Last name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div>
            <label className="form-label">
              Location (City, Country)
            </label>
            <input
              type="text"
              placeholder="e.g. Madrid, Spain"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">
              Bio
            </label>
            <textarea
              rows={3}
              placeholder="Tell us about yourself, your sporting journey and background..."
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="form-textarea"
            />
          </div>

          {/* Role specific fields */}
          {user?.role === 'PLAYER' && (
            <>
              <div className="edit-form-grid-2">
                <div>
                  <label className="form-label">
                    Primary Sport
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Soccer, Basketball"
                    value={formData.sport}
                    onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">
                    Position
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Striker, Point Guard"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
              <div>
                <label className="form-label">
                  Career Highlights / Summary
                </label>
                <textarea
                  rows={3}
                  placeholder="Key career stats, awards, or personal honors..."
                  value={formData.achievements}
                  onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
                  className="form-textarea"
                />
              </div>
            </>
          )}

          {user?.role === 'COACH' && (
            <>
              <div className="edit-form-grid-2">
                <div>
                  <label className="form-label">
                    Sport Specialization
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Soccer, Tennis"
                    value={formData.sport}
                    onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">
                    Coaching Level / Focus
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Youth Academy, Head Coach"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
              <div>
                <label className="form-label">
                  Certifications & Coaching Licenses
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. UEFA A License, USSF National Diploma..."
                  value={formData.certifications}
                  onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                  className="form-textarea"
                />
              </div>
              <div>
                <label className="form-label">
                  Coaching Experience & Philosophy
                </label>
                <textarea
                  rows={3}
                  placeholder="Teams managed, tactical philosophies, player development track record..."
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  className="form-textarea"
                />
              </div>
            </>
          )}

          {user?.role === 'CLUB' && (
            <>
              <div className="edit-form-grid-2">
                <div>
                  <label className="form-label">
                    Primary Sport / League
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Soccer - National Premier League"
                    value={formData.sport}
                    onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">
                    Club Division / Level
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Professional Tier 2, Academy"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
              <div>
                <label className="form-label">
                  Club Information & Facilities
                </label>
                <textarea
                  rows={3}
                  placeholder="Stadium, training grounds, academy teams, club history..."
                  value={formData.club_info}
                  onChange={(e) => setFormData({ ...formData, club_info: e.target.value })}
                  className="form-textarea"
                />
              </div>
            </>
          )}

          {user?.role === 'ASSOCIATION' && (
            <div>
              <label className="form-label">
                Governing Body Information
              </label>
              <textarea
                rows={3}
                placeholder="Association jurisdiction, registered clubs, official sanctioning..."
                value={formData.org_info}
                onChange={(e) => setFormData({ ...formData, org_info: e.target.value })}
                className="form-textarea"
              />
            </div>
          )}

          {user?.role === 'SPONSOR' && (
            <>
              <div className="edit-form-grid-2">
                <div>
                  <label className="form-label">
                    Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="Brand or corporate name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">
                    Industry
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sports Apparel, Nutrition, Tech"
                    value={formData.company_industry}
                    onChange={(e) => setFormData({ ...formData, company_industry: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
              <div>
                <label className="form-label">
                  Company Website
                </label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={formData.company_website}
                  onChange={(e) => setFormData({ ...formData, company_website: e.target.value })}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">
                  Company Profile & Sponsorship Goals
                </label>
                <textarea
                  rows={3}
                  placeholder="What types of athletes and clubs are you looking to sponsor?"
                  value={formData.company_profile}
                  onChange={(e) => setFormData({ ...formData, company_profile: e.target.value })}
                  className="form-textarea"
                />
              </div>
            </>
          )}

          {user?.role === 'SCOUT' && (
            <div>
              <label className="form-label">
                Scouting Profile & Talent Focus
              </label>
              <textarea
                rows={3}
                placeholder="Regions scouted, age brackets, key performance indicators evaluated..."
                value={formData.recruitment_profile}
                onChange={(e) => setFormData({ ...formData, recruitment_profile: e.target.value })}
                className="form-textarea"
              />
            </div>
          )}

          <div className="profile-edit-actions-row">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary profile-save-btn"
            >
              {isSubmitting ? 'Saving Changes...' : 'Save Profile'}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/profile/${user?.username}`)}
              className="btn btn-secondary profile-cancel-btn"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
