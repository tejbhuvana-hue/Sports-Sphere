import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sponsorshipsAPI, getMediaUrl } from '../services/api';
import {
  BriefcaseIcon,
  UsersGroupIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CloseIcon,
  UserIcon,
  MessagesIcon
} from '../components/common/Icons';

export const SponsorDashboardPage = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    opportunities: [],
    applications: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('proposals'); // 'proposals' | 'campaigns'

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingOpp, setEditingOpp] = useState(null);
  const [oppForm, setOppForm] = useState({ title: '', sport: '', amount: '', description: '' });
  const [isSaving, setIsSaving] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await sponsorshipsAPI.getSponsorDashboard();
      setDashboardData(res.data);
    } catch (err) {
      console.error('Failed to load sponsor dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleStatusUpdate = async (appId, status) => {
    try {
      await sponsorshipsAPI.updateApplicationStatus(appId, status);
      fetchDashboard();
    } catch (err) {
      console.error('Status update error', err);
    }
  };

  const handleSaveCampaign = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingOpp) {
        await sponsorshipsAPI.updateOpportunity(editingOpp.id, oppForm);
      } else {
        await sponsorshipsAPI.createOpportunity(oppForm);
      }
      setShowModal(false);
      setEditingOpp(null);
      setOppForm({ title: '', sport: '', amount: '', description: '' });
      fetchDashboard();
    } catch (err) {
      console.error('Save campaign error', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCampaign = async (oppId) => {
    if (!window.confirm('Delete this sponsorship opportunity?')) return;
    try {
      await sponsorshipsAPI.deleteOpportunity(oppId);
      fetchDashboard();
    } catch (err) {
      console.error('Delete campaign error', err);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>Loading sponsor dashboard...</div>;
  }

  const { opportunities = [], applications = [] } = dashboardData;

  return (
    <div className="sponsor-dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '800' }}>Sponsor Campaign Center</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Manage ambassador campaigns and review athlete pitch proposals.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingOpp(null);
            setOppForm({ title: '', sport: '', amount: '', description: '' });
            setShowModal(true);
          }}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <PlusIcon size={16} /> Launch New Campaign
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-subtle)', overflowX: 'auto', scrollbarWidth: 'none' }}>
        <button
          onClick={() => setActiveTab('proposals')}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'proposals' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'proposals' ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: '700',
            cursor: 'pointer',
            fontSize: '0.92rem',
            whiteSpace: 'nowrap'
          }}
        >
          Athlete Proposals ({applications.length})
        </button>

        <button
          onClick={() => setActiveTab('campaigns')}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'campaigns' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'campaigns' ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: '700',
            cursor: 'pointer',
            fontSize: '0.92rem',
            whiteSpace: 'nowrap'
          }}
        >
          Active Campaigns ({opportunities.length})
        </button>
      </div>

      {/* TAB 1: PROPOSALS */}
      {activeTab === 'proposals' && (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px' }}>Received Proposals</h3>
          {applications.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {applications.map((app) => {
                const player = app.player || {};
                const avatarUrl = player.profile_picture ? getMediaUrl(player.profile_picture) : null;

                return (
                  <div key={app.id} style={{ padding: '16px', background: 'var(--bg-subtle-2)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ flex: 1, minWidth: '260px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={player.username} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.75rem' }}>
                            {player.username?.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <Link to={`/profile/${player.username}`} style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)', textDecoration: 'none' }}>
                            {player.username}
                          </Link>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                            for <strong>{app.sponsorship_post?.title}</strong> ({app.sponsorship_post?.amount})
                          </span>
                        </div>
                      </div>

                      <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: '1.5', margin: '8px 0', background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px' }}>
                        "{app.pitch_message}"
                      </p>

                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <Link to={`/messages/${player.username}`} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}>
                          <MessagesIcon size={14} /> Message Athlete
                        </Link>
                        <Link to={`/profile/${player.username}`} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}>
                          <UserIcon size={14} /> Full Profile
                        </Link>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                      <span className={`status-badge ${app.status === 'ACCEPTED' ? 'status-active' : app.status === 'REJECTED' ? 'status-inactive' : 'status-draft'}`} style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
                        {app.status}
                      </span>

                      {app.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleStatusUpdate(app.id, 'ACCEPTED')}
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: '0.78rem', background: '#00e676', color: '#000' }}
                          >
                            Accept Deal
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(app.id, 'REJECTED')}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.78rem', color: '#ff5252' }}
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
              No athlete proposals received yet.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CAMPAIGNS */}
      {activeTab === 'campaigns' && (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px' }}>Your Active Sponsorship Deals</h3>
          {opportunities.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {opportunities.map((opp) => (
                <div key={opp.id} style={{ padding: '16px', background: 'var(--bg-subtle-2)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h4 style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--text-primary)' }}>{opp.title}</h4>
                    <div style={{ fontSize: '0.82rem', color: 'var(--accent)', marginTop: '2px' }}>
                      Sport: {opp.sport} • Budget: <strong style={{ color: '#00e676' }}>{opp.amount}</strong>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <UsersGroupIcon size={14} /> {opp.applications_count} Athlete Pitches
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setEditingOpp(opp);
                        setOppForm({
                          title: opp.title,
                          sport: opp.sport,
                          amount: opp.amount,
                          description: opp.description,
                        });
                        setShowModal(true);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <PencilIcon size={14} /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCampaign(opp.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#ff5252', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <TrashIcon size={14} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
              You haven't posted any sponsorship campaigns yet.
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <button className="admin-modal-close" onClick={() => setShowModal(false)}>
              <CloseIcon size={20} />
            </button>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
              {editingOpp ? 'Edit Sponsorship Campaign' : 'Launch New Campaign'}
            </h3>

            <form onSubmit={handleSaveCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Campaign Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026 Elite Runner Ambassador Program"
                  value={oppForm.title}
                  onChange={(e) => setOppForm({ ...oppForm, title: e.target.value })}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Sport</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Track & Field, Tennis"
                    value={oppForm.sport}
                    onChange={(e) => setOppForm({ ...oppForm, sport: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Budget / Deal Value</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. $5,000 / Season + Gear"
                    value={oppForm.amount}
                    onChange={(e) => setOppForm({ ...oppForm, amount: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Campaign Description & Expectations</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Social media deliverables, event appearances, eligibility criteria..."
                  value={oppForm.description}
                  onChange={(e) => setOppForm({ ...oppForm, description: e.target.value })}
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" disabled={isSaving} className="btn btn-primary btn-sm">
                  {isSaving ? 'Saving...' : editingOpp ? 'Update Campaign' : 'Launch Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
