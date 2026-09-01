import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { recruitmentAPI, getMediaUrl } from '../services/api';
import {
  UsersGroupIcon,
  PlusIcon,
  CloseIcon,
  TrashIcon,
  PencilIcon,
  FileTextIcon,
  CertificateIcon,
  CalendarIcon,
  UserIcon
} from '../components/common/Icons';

export const ClubDashboardPage = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    active_posts: [],
    applications: [],
    roster: [],
    available_players: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('applications'); // 'applications' | 'posts' | 'roster'

  // Post modal
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [postForm, setPostForm] = useState({ title: '', sport: '', position_needed: '', description: '', deadline: '' });
  const [isSavingPost, setIsSavingPost] = useState(false);

  // Add member modal
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');

  const fetchDashboard = async () => {
    try {
      const res = await recruitmentAPI.getClubDashboard();
      setDashboardData(res.data);
    } catch (err) {
      console.error('Failed to load club dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleStatusUpdate = async (appId, status) => {
    try {
      await recruitmentAPI.updateApplicationStatus(appId, status);
      fetchDashboard();
    } catch (err) {
      console.error('Status update error', err);
    }
  };

  const handleSavePost = async (e) => {
    e.preventDefault();
    setIsSavingPost(true);
    try {
      if (editingPost) {
        await recruitmentAPI.updateListing(editingPost.id, postForm);
      } else {
        await recruitmentAPI.createListing(postForm);
      }
      setShowPostModal(false);
      setEditingPost(null);
      setPostForm({ title: '', sport: '', position_needed: '', description: '', deadline: '' });
      fetchDashboard();
    } catch (err) {
      console.error('Save post error', err);
    } finally {
      setIsSavingPost(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this recruitment ad?')) return;
    try {
      await recruitmentAPI.deleteListing(postId);
      fetchDashboard();
    } catch (err) {
      console.error('Delete post error', err);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedPlayerId) return;
    try {
      await recruitmentAPI.addClubMember(selectedPlayerId);
      setShowAddMemberModal(false);
      setSelectedPlayerId('');
      fetchDashboard();
    } catch (err) {
      console.error('Add member error', err);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this player from the roster?')) return;
    try {
      await recruitmentAPI.removeClubMember(memberId);
      fetchDashboard();
    } catch (err) {
      console.error('Remove member error', err);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>Loading club dashboard...</div>;
  }

  const { active_posts = [], applications = [], roster = [], available_players = [] } = dashboardData;

  return (
    <div className="club-dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Dashboard Top Header */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '800' }}>Club Management Hub</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Manage player recruitment, trial applications, and your official team roster.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingPost(null);
            setPostForm({ title: '', sport: '', position_needed: '', description: '', deadline: '' });
            setShowPostModal(true);
          }}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <PlusIcon size={16} /> Post New Recruitment Ad
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-subtle)', overflowX: 'auto', scrollbarWidth: 'none' }}>
        <button
          onClick={() => setActiveTab('applications')}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'applications' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'applications' ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: '700',
            cursor: 'pointer',
            fontSize: '0.92rem',
            whiteSpace: 'nowrap'
          }}
        >
          Trial Applications ({applications.length})
        </button>

        <button
          onClick={() => setActiveTab('posts')}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'posts' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'posts' ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: '700',
            cursor: 'pointer',
            fontSize: '0.92rem',
            whiteSpace: 'nowrap'
          }}
        >
          Active Recruitment Ads ({active_posts.length})
        </button>

        <button
          onClick={() => setActiveTab('roster')}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'roster' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'roster' ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: '700',
            cursor: 'pointer',
            fontSize: '0.92rem',
            whiteSpace: 'nowrap'
          }}
        >
          Team Roster ({roster.length})
        </button>
      </div>

      {/* TAB 1: APPLICATIONS */}
      {activeTab === 'applications' && (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px' }}>Applicant Screening</h3>
          {applications.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {applications.map((app) => {
                const player = app.player || {};
                const resumeUrl = app.resume_file ? getMediaUrl(app.resume_file) : null;
                const certUrl = app.certificates_file ? getMediaUrl(app.certificates_file) : null;

                return (
                  <div key={app.id} style={{ padding: '16px', background: 'var(--bg-subtle-2)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ flex: 1, minWidth: '260px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <Link to={`/profile/${player.username}`} style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)', textDecoration: 'none' }}>
                          {player.username}
                        </Link>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          applying for <strong>{app.recruitment_post?.title}</strong>
                        </span>
                      </div>

                      <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: '1.5', margin: '8px 0', background: 'var(--bg-subtle)', padding: '10px', borderRadius: '6px' }}>
                        "{app.cover_letter}"
                      </p>

                      <div style={{ display: 'flex', gap: '14px', fontSize: '0.82rem', marginTop: '8px', flexWrap: 'wrap' }}>
                        {resumeUrl && (
                          <a href={resumeUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <FileTextIcon size={14} /> View Resume / CV
                          </a>
                        )}
                        {certUrl && (
                          <a href={certUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CertificateIcon size={14} /> View Certificates
                          </a>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                      <span className={`status-badge ${app.status === 'ACCEPTED' ? 'status-active' : app.status === 'REJECTED' ? 'status-inactive' : 'status-draft'}`} style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
                        {app.status}
                      </span>

                      {app.status === 'APPLIED' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleStatusUpdate(app.id, 'ACCEPTED')}
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: '0.78rem', background: '#00e676', color: '#000' }}
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(app.id, 'REJECTED')}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.78rem', color: '#ff5252' }}
                          >
                            Reject
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
              No applicants yet. Post active recruitment postings to attract players!
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ACTIVE POSTS */}
      {activeTab === 'posts' && (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px' }}>Your Recruitment Openings</h3>
          {active_posts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {active_posts.map((p) => (
                <div key={p.id} style={{ padding: '16px', background: 'var(--bg-subtle-2)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h4 style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--text-primary)' }}>{p.title}</h4>
                    <div style={{ fontSize: '0.82rem', color: 'var(--accent)', marginTop: '2px' }}>
                      Sport: {p.sport} • Position: {p.position_needed}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <UsersGroupIcon size={14} /> {p.applications_count} Candidates Applied {p.deadline ? `• Deadline: ${p.deadline}` : ''}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setEditingPost(p);
                        setPostForm({
                          title: p.title,
                          sport: p.sport,
                          position_needed: p.position_needed,
                          description: p.description,
                          deadline: p.deadline || '',
                        });
                        setShowPostModal(true);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <PencilIcon size={14} /> Edit
                    </button>
                    <button
                      onClick={() => handleDeletePost(p.id)}
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
              You haven't posted any recruitment listings yet.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ROSTER */}
      {activeTab === 'roster' && (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800' }}>Official Team Roster</h3>
            <button onClick={() => setShowAddMemberModal(true)} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PlusIcon size={16} /> Add Available Player
            </button>
          </div>

          {roster.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
              {roster.map((m) => {
                const player = m.player || {};
                const avatarUrl = player.profile_picture ? getMediaUrl(player.profile_picture) : null;

                return (
                  <div key={m.id} style={{ padding: '14px', background: 'var(--bg-subtle-2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Link to={`/profile/${player.username}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}>
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={player.username} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.8rem' }}>
                          {player.username?.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{player.username}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Joined: {new Date(m.joined_at).toLocaleDateString()}</div>
                      </div>
                    </Link>

                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', display: 'flex', padding: '4px' }}
                      title="Remove from Roster"
                    >
                      <TrashIcon size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
              Your roster is empty. Accept candidates from applications or add players!
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Post Modal */}
      {showPostModal && (
        <div className="admin-modal-overlay" onClick={() => setShowPostModal(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <button className="admin-modal-close" onClick={() => setShowPostModal(false)}>
              <CloseIcon size={20} />
            </button>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
              {editingPost ? 'Edit Recruitment Ad' : 'Create Recruitment Opening'}
            </h3>

            <form onSubmit={handleSavePost} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. U-19 Academy Striker Wanted"
                  value={postForm.title}
                  onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Sport</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Football / Soccer"
                    value={postForm.sport}
                    onChange={(e) => setPostForm({ ...postForm, sport: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Position Needed</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Striker, Center Back"
                    value={postForm.position_needed}
                    onChange={(e) => setPostForm({ ...postForm, position_needed: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Application Deadline (Optional)</label>
                <input
                  type="date"
                  value={postForm.deadline}
                  onChange={(e) => setPostForm({ ...postForm, deadline: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Description & Trial Requirements</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe age groups, requirements, training schedule, trial dates..."
                  value={postForm.description}
                  onChange={(e) => setPostForm({ ...postForm, description: e.target.value })}
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowPostModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" disabled={isSavingPost} className="btn btn-primary btn-sm">
                  {isSavingPost ? 'Saving...' : editingPost ? 'Update Ad' : 'Publish Ad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="admin-modal-overlay" onClick={() => setShowAddMemberModal(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <button className="admin-modal-close" onClick={() => setShowAddMemberModal(false)}>
              <CloseIcon size={20} />
            </button>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
              Add Player to Roster
            </h3>

            <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Select Player
                </label>
                <select
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  required
                  className="admin-select-input"
                  style={{ width: '100%' }}
                >
                  <option value="">-- Choose a Player --</option>
                  {available_players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.username} ({p.sport || 'Athlete'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAddMemberModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" disabled={!selectedPlayerId} className="btn btn-primary btn-sm">
                  Add to Roster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
