import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tournamentsAPI } from '../services/api';
import { TrophyIcon, CalendarIcon, MapPinIcon, UserIcon, UsersGroupIcon, PlusIcon, CloseIcon, ChevronRightIcon } from '../components/common/Icons';

export const TournamentsPage = () => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [q, setQ] = useState('');
  const [sport, setSport] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    sport: '',
    venue: '',
    start_date: '',
    end_date: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const res = await tournamentsAPI.getTournaments({ q, sport });
      setTournaments(res.data || []);
    } catch (err) {
      console.error('Failed to load tournaments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, [sport]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTournaments();
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await tournamentsAPI.createTournament(formData);
      setShowCreateModal(false);
      setFormData({ name: '', sport: '', venue: '', start_date: '', end_date: '', description: '' });
      fetchTournaments();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to host tournament.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canHost = user?.role === 'CLUB' || user?.role === 'ASSOCIATION';

  return (
    <div className="tournaments-container">
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Tournaments & Leagues</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Compete, track standings, and showcase your team on the digital pitch.
          </p>
        </div>
        {canHost && (
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PlusIcon size={18} /> Host Tournament
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search tournament name, venue, organizer..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{
              flex: 1,
              minWidth: '200px',
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
            placeholder="Filter by sport (e.g. Soccer)"
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            style={{
              width: '180px',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid var(--input-border)',
              background: 'var(--input-bg)',
              color: 'var(--text-primary)',
              outline: 'none'
            }}
          />
          <button type="submit" className="btn btn-secondary btn-sm" style={{ padding: '0 20px' }}>
            Filter
          </button>
        </form>
      </div>

      {/* Tournaments Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading tournaments...</div>
      ) : tournaments.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {tournaments.map((t) => (
            <div key={t.id} className="glass-panel tournament-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', borderRadius: 'var(--border-radius)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: '800', background: 'rgba(0, 217, 255, 0.1)', padding: '3px 8px', borderRadius: '6px' }}>
                  {t.sport}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <UsersGroupIcon size={14} /> {t.registered_teams?.length || 0} Teams
                </span>
              </div>

              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>
                {t.name}
              </h3>

              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '14px', flex: 1 }}>
                {t.description?.slice(0, 110)}...
              </p>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPinIcon size={14} /> {t.venue}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CalendarIcon size={14} /> {t.start_date} to {t.end_date}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserIcon size={14} /> Hosted by: @{t.creator?.username}
                </div>
              </div>

              <Link to={`/tournaments/${t.id}`} className="btn btn-primary btn-sm" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                View Tournament & Standings <ChevronRightIcon size={16} />
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 24px', borderRadius: 'var(--border-radius)' }}>
          <TrophyIcon size={44} className="empty-icon" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '6px' }}>No Tournaments Found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Try adjusting your search criteria or host the first tournament!</p>
        </div>
      )}

      {/* Host Tournament Modal */}
      {showCreateModal && (
        <div className="admin-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <button className="admin-modal-close" onClick={() => setShowCreateModal(false)}>
              <CloseIcon size={20} />
            </button>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrophyIcon size={22} /> Host a New Tournament
            </h3>

            {error && <div style={{ color: '#ff5252', marginBottom: '12px', fontSize: '0.85rem' }}>{error}</div>}

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Tournament Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SportsSphere Champions Cup"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Sport</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Soccer"
                    value={formData.sport}
                    onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Venue / Stadium</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Metro Sports Arena"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    className="form-input"
                  />
                </div>
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
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Description & Rules</label>
                <textarea
                  rows={3}
                  placeholder="Format, prizes, registration criteria..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-sm">
                  {isSubmitting ? 'Creating...' : 'Create Tournament'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
