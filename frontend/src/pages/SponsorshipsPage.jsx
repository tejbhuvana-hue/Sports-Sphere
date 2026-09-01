import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sponsorshipsAPI } from '../services/api';
import { BriefcaseIcon, UsersGroupIcon, CloseIcon, ChevronRightIcon, UserIcon } from '../components/common/Icons';

export const SponsorshipsPage = () => {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState([]);
  const [sport, setSport] = useState('');
  const [loading, setLoading] = useState(true);

  // Proposal modal
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [pitchMessage, setPitchMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appMessage, setAppMessage] = useState('');
  const [appError, setAppError] = useState('');

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const res = await sponsorshipsAPI.getOpportunities({ sport });
      setOpportunities(res.data || []);
    } catch (err) {
      console.error('Failed to load sponsorships', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, [sport]);

  const handlePitchSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOpp || !pitchMessage.trim()) return;
    setIsSubmitting(true);
    setAppMessage('');
    setAppError('');

    try {
      await sponsorshipsAPI.apply(selectedOpp.id, { pitch_message: pitchMessage.trim() });
      setAppMessage('Proposal submitted to sponsor successfully!');
      fetchOpportunities();
      setTimeout(() => {
        setSelectedOpp(null);
        setPitchMessage('');
        setAppMessage('');
      }, 1200);
    } catch (err) {
      setAppError(err.response?.data?.error || 'Failed to submit proposal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPlayer = user?.role === 'PLAYER';
  const isSponsor = user?.role === 'SPONSOR';

  return (
    <div className="sponsorships-container">
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Sponsorship Marketplace</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Connect with commercial brands, hydration partners, and gear sponsors.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {isSponsor && (
            <Link to="/sponsorships/dashboard" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BriefcaseIcon size={16} /> Sponsor Dashboard
            </Link>
          )}
          {isPlayer && (
            <Link to="/sponsorships/my-applications" className="btn btn-secondary btn-sm">
              My Submitted Pitches
            </Link>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <input
          type="text"
          placeholder="Filter campaigns by sport (e.g. Basketball, Track)..."
          value={sport}
          onChange={(e) => setSport(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid var(--input-border)',
            background: 'var(--input-bg)',
            color: 'var(--text-primary)',
            outline: 'none'
          }}
        />
      </div>

      {/* Opportunities Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading sponsorships...</div>
      ) : opportunities.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {opportunities.map((opp) => (
            <div key={opp.id} className="glass-panel sponsorship-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', borderRadius: 'var(--border-radius)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: '800', background: 'rgba(0, 217, 255, 0.1)', padding: '3px 8px', borderRadius: '6px' }}>
                  {opp.sport}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#00e676' }}>
                  {opp.amount}
                </span>
              </div>

              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '6px', color: 'var(--text-primary)' }}>
                {opp.title}
              </h3>

              <Link to={`/profile/${opp.sponsor?.username}`} style={{ fontSize: '0.88rem', color: 'var(--accent)', fontWeight: '600', textDecoration: 'none', marginBottom: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <BriefcaseIcon size={14} /> @{opp.sponsor?.username}
              </Link>

              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '16px', flex: 1 }}>
                {opp.description}
              </p>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <UsersGroupIcon size={14} /> {opp.applications_count} Athlete Pitches Submitted
              </div>

              {isPlayer ? (
                opp.has_applied ? (
                  <button disabled className="btn btn-secondary btn-sm" style={{ width: '100%', opacity: 0.7 }}>
                    ✓ Pitch Submitted
                  </button>
                ) : (
                  <button
                    onClick={() => setSelectedOpp(opp)}
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    Pitch Your Profile <ChevronRightIcon size={16} />
                  </button>
                )
              ) : (
                <Link to={`/profile/${opp.sponsor?.username}`} className="btn btn-secondary btn-sm" style={{ width: '100%', textAlign: 'center' }}>
                  View Sponsor Profile
                </Link>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 24px', borderRadius: 'var(--border-radius)' }}>
          <BriefcaseIcon size={44} className="empty-icon" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '6px' }}>No Active Sponsorship Campaigns</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Check back later as sponsors launch new ambassador programs.</p>
        </div>
      )}

      {/* Pitch Modal */}
      {selectedOpp && (
        <div className="admin-modal-overlay" onClick={() => setSelectedOpp(null)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <button className="admin-modal-close" onClick={() => setSelectedOpp(null)}>
              <CloseIcon size={20} />
            </button>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '6px', color: 'var(--text-primary)' }}>
              Pitch Proposal for {selectedOpp.title}
            </h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Sponsor: <strong>{selectedOpp.sponsor?.username}</strong> • Budget: <strong style={{ color: '#00e676' }}>{selectedOpp.amount}</strong>
            </div>

            {appMessage && (
              <div style={{ background: 'rgba(0, 230, 118, 0.1)', color: '#00e676', padding: '10px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.85rem' }}>
                {appMessage}
              </div>
            )}
            {appError && (
              <div style={{ background: 'rgba(255, 75, 75, 0.1)', color: '#ff4d4d', padding: '10px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.85rem' }}>
                {appError}
              </div>
            )}

            <form onSubmit={handlePitchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Your Ambassador Pitch & Deliverables
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Explain why you are the ideal brand ambassador, your audience reach, upcoming matches, and promotional ideas..."
                  value={pitchMessage}
                  onChange={(e) => setPitchMessage(e.target.value)}
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setSelectedOpp(null)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-sm">
                  {isSubmitting ? 'Submitting...' : 'Submit Pitch Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
