import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sponsorshipsAPI } from '../services/api';
import { BriefcaseIcon } from '../components/common/Icons';

export const PlayerSponsorshipsPage = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const res = await sponsorshipsAPI.getMyApplications();
        setApplications(res.data || []);
      } catch (err) {
        console.error('Failed to load applications', err);
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, []);

  return (
    <div className="player-sponsorships-container" style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800' }}>My Sponsorship Pitches</h2>
          <Link to="/sponsorships" className="btn btn-primary btn-sm">Browse Opportunities</Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>Loading pitches...</div>
        ) : applications.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {applications.map((app) => {
              const opp = app.opportunity || {};
              return (
                <div key={app.id} style={{ padding: '16px', background: 'var(--bg-subtle-2)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <h4 style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--text-primary)' }}>{opp.title}</h4>
                    <div style={{ fontSize: '0.85rem', color: 'var(--accent)', marginTop: '2px' }}>
                      Sponsor: <strong>{opp.sponsor?.username}</strong> • Deal: <strong style={{ color: '#00e676' }}>{opp.amount}</strong>
                    </div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', margin: '8px 0', background: 'var(--bg-subtle)', padding: '10px', borderRadius: '6px' }}>
                      "{app.pitch_message}"
                    </p>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Pitched on: {new Date(app.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <span className={`status-badge ${app.status === 'ACCEPTED' ? 'status-active' : app.status === 'REJECTED' ? 'status-inactive' : 'status-draft'}`} style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
                    {app.status}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
            <BriefcaseIcon size={44} className="empty-icon" />
            <p>You haven't pitched to any sponsorship opportunities yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};
