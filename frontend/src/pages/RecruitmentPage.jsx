import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { recruitmentAPI } from '../services/api';
import { TargetIcon, UsersGroupIcon, CalendarIcon, CloseIcon, ChevronRightIcon, BriefcaseIcon } from '../components/common/Icons';

export const RecruitmentPage = () => {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [sport, setSport] = useState('');
  const [position, setPosition] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('listings'); // 'listings' | 'my_apps'

  // Application Modal
  const [selectedListing, setSelectedListing] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [certFile, setCertFile] = useState(null);
  const [isApplying, setIsApplying] = useState(false);
  const [appMessage, setAppMessage] = useState('');
  const [appError, setAppError] = useState('');

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await recruitmentAPI.getListings({ sport, position });
      setListings(res.data || []);
    } catch (err) {
      console.error('Failed to load recruitment listings', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyApplications = async () => {
    if (user?.role === 'PLAYER') {
      try {
        const res = await recruitmentAPI.getMyApplications();
        setMyApplications(res.data || []);
      } catch (err) {
        console.warn('Failed to load applications', err);
      }
    }
  };

  useEffect(() => {
    fetchListings();
    fetchMyApplications();
  }, [sport, position]);

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!selectedListing) return;
    setIsApplying(true);
    setAppMessage('');
    setAppError('');

    try {
      const formData = new FormData();
      if (coverLetter.trim()) formData.append('cover_letter', coverLetter.trim());
      if (resumeFile) formData.append('resume_file', resumeFile);
      if (certFile) formData.append('certificates_file', certFile);

      await recruitmentAPI.apply(selectedListing.id, formData);
      setAppMessage('Application submitted successfully!');
      fetchMyApplications();
      fetchListings();
      setTimeout(() => {
        setSelectedListing(null);
        setCoverLetter('');
        setResumeFile(null);
        setCertFile(null);
        setAppMessage('');
      }, 1200);
    } catch (err) {
      setAppError(err.response?.data?.error || 'Failed to submit application.');
    } finally {
      setIsApplying(false);
    }
  };

  const isPlayer = user?.role === 'PLAYER';
  const isClub = user?.role === 'CLUB';

  return (
    <div className="recruitment-container">
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Club Recruitment & Trials</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Find open roster spots, trials, and club academy openings.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {isClub && (
            <Link to="/club/dashboard" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UsersGroupIcon size={16} /> Club Dashboard
            </Link>
          )}
          {isPlayer && (
            <button
              onClick={() => setActiveTab(activeTab === 'listings' ? 'my_apps' : 'listings')}
              className="btn btn-secondary btn-sm"
            >
              {activeTab === 'listings' ? `My Applications (${myApplications.length})` : 'Browse Openings'}
            </button>
          )}
        </div>
      </div>

      {activeTab === 'listings' ? (
        <>
          {/* Filter Bar */}
          <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Filter by sport (e.g. Football)"
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              style={{
                flex: 1,
                minWidth: '180px',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--input-border)',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
            <input
              type="text"
              placeholder="Filter by position (e.g. Striker)"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              style={{
                flex: 1,
                minWidth: '180px',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--input-border)',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
          </div>

          {/* Listings Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading recruitment ads...</div>
          ) : listings.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {listings.map((l) => (
                <div key={l.id} className="glass-panel recruitment-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', borderRadius: 'var(--border-radius)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: '800', background: 'rgba(0, 217, 255, 0.1)', padding: '3px 8px', borderRadius: '6px' }}>
                      {l.sport} • {l.position_needed}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <UsersGroupIcon size={14} /> {l.applications_count} Applied
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '6px', color: 'var(--text-primary)' }}>
                    {l.title}
                  </h3>

                  <Link to={`/profile/${l.club?.username}`} style={{ fontSize: '0.88rem', color: 'var(--accent)', fontWeight: '600', textDecoration: 'none', marginBottom: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <BriefcaseIcon size={14} /> @{l.club?.username}
                  </Link>

                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '16px', flex: 1 }}>
                    {l.description}
                  </p>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CalendarIcon size={14} /> {l.deadline ? `Deadline: ${l.deadline}` : 'Open enrollment'}
                  </div>

                  {isPlayer ? (
                    l.has_applied ? (
                      <button disabled className="btn btn-secondary btn-sm" style={{ width: '100%', opacity: 0.7 }}>
                        ✓ Applied
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedListing(l)}
                        className="btn btn-primary btn-sm"
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        Apply for Trial <ChevronRightIcon size={16} />
                      </button>
                    )
                  ) : (
                    <Link to={`/profile/${l.club?.username}`} className="btn btn-secondary btn-sm" style={{ width: '100%', textAlign: 'center' }}>
                      View Club Profile
                    </Link>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 24px', borderRadius: 'var(--border-radius)' }}>
              <TargetIcon size={44} className="empty-icon" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '6px' }}>No Active Recruitment Ads</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Check back later or explore clubs directly.</p>
            </div>
          )}
        </>
      ) : (
        /* MY APPLICATIONS TAB */
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px' }}>My Applications</h3>
          {myApplications.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {myApplications.map((app) => (
                <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'var(--bg-subtle-2)', borderRadius: '10px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h4 style={{ fontWeight: '700', fontSize: '1rem' }}>{app.recruitment_post?.title}</h4>
                    <div style={{ fontSize: '0.82rem', color: 'var(--accent)' }}>
                      Club: {app.recruitment_post?.club?.username}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Submitted: {new Date(app.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`status-badge ${app.status === 'ACCEPTED' ? 'status-active' : app.status === 'REJECTED' ? 'status-inactive' : 'status-draft'}`} style={{ padding: '6px 12px', fontSize: '0.82rem' }}>
                    {app.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
              You have not applied to any recruitment postings yet.
            </div>
          )}
        </div>
      )}

      {/* Apply Modal */}
      {selectedListing && (
        <div className="admin-modal-overlay" onClick={() => setSelectedListing(null)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <button className="admin-modal-close" onClick={() => setSelectedListing(null)}>
              <CloseIcon size={20} />
            </button>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>
              Apply for {selectedListing.title}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Club: <strong>{selectedListing.club?.username}</strong> • Sport: {selectedListing.sport}
            </p>

            {appMessage && (
              <div className="alert-box alert-success" style={{ marginBottom: '14px' }}>
                {appMessage}
              </div>
            )}
            {appError && (
              <div className="alert-box alert-danger" style={{ marginBottom: '14px' }}>
                {appError}
              </div>
            )}

            <form onSubmit={handleApplySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Cover Note / Message to Coach
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain why you want to trial for this club, your primary position, playing style, and availability..."
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Attach CV / Athletic Resume (PDF)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setResumeFile(e.target.files[0])}
                    className="form-file-input"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Attach Certificate / ID (PDF/Img)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => setCertFile(e.target.files[0])}
                    className="form-file-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setSelectedListing(null)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" disabled={isApplying} className="btn btn-primary btn-sm">
                  {isApplying ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
