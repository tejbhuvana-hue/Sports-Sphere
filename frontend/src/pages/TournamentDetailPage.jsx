import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tournamentsAPI } from '../services/api';
import {
  TrophyIcon,
  SwordsIcon,
  MapPinIcon,
  CalendarIcon,
  UserIcon,
  UsersGroupIcon,
  ZapIcon,
  CloseIcon,
  ArrowLeftIcon,
  PlusIcon
} from '../components/common/Icons';

export const TournamentDetailPage = () => {
  const { id: tournamentId } = useParams();
  const { user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Selected match for recording score
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [isUpdatingScore, setIsUpdatingScore] = useState(false);

  const fetchTournament = async () => {
    try {
      const res = await tournamentsAPI.getTournamentDetail(tournamentId);
      setTournament(res.data);
    } catch (err) {
      console.error('Failed to load tournament detail', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournament();
  }, [tournamentId]);

  const handleRegister = async () => {
    setError('');
    setSuccess('');
    try {
      const res = await tournamentsAPI.registerForTournament(tournamentId);
      setSuccess(res.data.message || 'Club registered successfully!');
      fetchTournament();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register.');
    }
  };

  const handleGenerateFixtures = async () => {
    setError('');
    setSuccess('');
    try {
      const res = await tournamentsAPI.generateFixtures(tournamentId);
      setSuccess(res.data.message || 'Fixtures generated!');
      fetchTournament();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate fixtures.');
    }
  };

  const handleUpdateScore = async (e) => {
    e.preventDefault();
    if (!selectedMatch) return;
    setIsUpdatingScore(true);
    try {
      await tournamentsAPI.updateMatchScore(selectedMatch.id, {
        home_score: parseInt(homeScore, 10),
        away_score: parseInt(awayScore, 10),
      });
      setSelectedMatch(null);
      setHomeScore('');
      setAwayScore('');
      fetchTournament();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update score.');
    } finally {
      setIsUpdatingScore(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>Loading tournament...</div>;
  }

  if (!tournament) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '40px', borderRadius: 'var(--border-radius)' }}>
        <h3>Tournament not found</h3>
        <Link to="/tournaments" className="btn btn-primary btn-sm" style={{ marginTop: '12px' }}>Back to Tournaments</Link>
      </div>
    );
  }

  const isClub = user?.role === 'CLUB';
  const isCreator = tournament.is_creator;
  const matches = tournament.matches || [];
  const registeredTeams = tournament.registered_teams || [];
  const standings = tournament.standings || [];

  return (
    <div className="tournament-detail-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <Link to="/tournaments" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeftIcon size={16} /> Back to all tournaments
        </Link>
      </div>

      {/* Header Panel */}
      <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--border-radius)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: '800', background: 'rgba(0, 217, 255, 0.1)', padding: '4px 10px', borderRadius: '8px' }}>
              {tournament.sport} Championship
            </span>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '8px', color: 'var(--text-primary)' }}>
              {tournament.name}
            </h1>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <MapPinIcon size={14} /> {tournament.venue}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <CalendarIcon size={14} /> {tournament.start_date} to {tournament.end_date}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <UserIcon size={14} /> Hosted by: @{tournament.creator?.username}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {isClub && !tournament.is_registered && (
              <button onClick={handleRegister} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PlusIcon size={16} /> Register Club Team
              </button>
            )}
            {isClub && tournament.is_registered && (
              <span className="status-badge status-active" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
                ✓ Registered
              </span>
            )}
            {isCreator && matches.length === 0 && (
              <button
                onClick={handleGenerateFixtures}
                disabled={registeredTeams.length < 2}
                className="btn btn-primary btn-sm"
                title={registeredTeams.length < 2 ? 'At least 2 teams required' : 'Generate Round-Robin Fixtures'}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ZapIcon size={16} /> Generate Fixtures ({registeredTeams.length} Teams)
              </button>
            )}
          </div>
        </div>

        {success && (
          <div style={{ background: 'rgba(0, 230, 118, 0.1)', border: '1px solid rgba(0, 230, 118, 0.3)', color: '#00e676', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem' }}>
            {success}
          </div>
        )}
        {error && (
          <div style={{ background: 'rgba(255, 75, 75, 0.1)', border: '1px solid rgba(255, 75, 75, 0.3)', color: '#ff4d4d', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem' }}>
            {error}
          </div>
        )}

        <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-primary)', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
          {tournament.description}
        </p>
      </div>

      {/* Grid: Standings Table & Matches List */}
      <div className="tournament-content-grid">
        {/* Live Standings Table */}
        <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--border-radius)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrophyIcon size={20} /> Standings Table
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 6px' }}>#</th>
                  <th style={{ padding: '8px 6px' }}>Club</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center' }}>P</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center' }}>W</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center' }}>D</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center' }}>L</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center' }}>GF</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center' }}>GA</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', color: 'var(--accent)', fontWeight: '800' }}>PTS</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((st, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle-2)' }}>
                    <td style={{ padding: '10px 6px', fontWeight: '700' }}>{idx + 1}</td>
                    <td style={{ padding: '10px 6px', fontWeight: '600' }}>
                      <Link to={`/profile/${st.team?.username}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {st.team?.username}
                      </Link>
                    </td>
                    <td style={{ padding: '10px 6px', textAlign: 'center' }}>{st.played}</td>
                    <td style={{ padding: '10px 6px', textAlign: 'center' }}>{st.won}</td>
                    <td style={{ padding: '10px 6px', textAlign: 'center' }}>{st.drawn}</td>
                    <td style={{ padding: '10px 6px', textAlign: 'center' }}>{st.lost}</td>
                    <td style={{ padding: '10px 6px', textAlign: 'center' }}>{st.goals_for}</td>
                    <td style={{ padding: '10px 6px', textAlign: 'center' }}>{st.goals_against}</td>
                    <td style={{ padding: '10px 6px', textAlign: 'center', color: 'var(--accent)', fontWeight: '800' }}>{st.points}</td>
                  </tr>
                ))}
                {standings.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                      No registered clubs yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fixtures & Matches */}
        <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--border-radius)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SwordsIcon size={20} /> Fixtures & Results ({matches.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
            {matches.map((m) => (
              <div key={m.id} style={{ padding: '14px', background: 'var(--bg-subtle-2)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{m.home_team?.username}</span>
                    <span style={{
                      padding: '2px 8px',
                      background: m.is_completed ? 'var(--accent)' : 'var(--border-subtle)',
                      color: m.is_completed ? '#081426' : 'var(--text-primary)',
                      borderRadius: '6px',
                      fontWeight: '800'
                    }}>
                      {m.is_completed ? `${m.home_score} - ${m.away_score}` : 'VS'}
                    </span>
                    <span>{m.away_team?.username}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CalendarIcon size={12} /> {new Date(m.match_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {isCreator && (
                  <button
                    onClick={() => {
                      setSelectedMatch(m);
                      setHomeScore(m.home_score !== null ? m.home_score : '');
                      setAwayScore(m.away_score !== null ? m.away_score : '');
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.78rem' }}
                  >
                    {m.is_completed ? 'Edit Score' : 'Record Score'}
                  </button>
                )}
              </div>
            ))}

            {matches.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Fixtures have not been generated yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Record Score Modal */}
      {selectedMatch && (
        <div className="admin-modal-overlay" onClick={() => setSelectedMatch(null)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <button className="admin-modal-close" onClick={() => setSelectedMatch(null)}>
              <CloseIcon size={20} />
            </button>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
              Record Match Score
            </h3>

            <form onSubmit={handleUpdateScore} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    {selectedMatch.home_team?.username}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={homeScore}
                    onChange={(e) => setHomeScore(e.target.value)}
                    style={{ width: '60px', padding: '10px', textAlign: 'center', fontSize: '1.2rem', fontWeight: '800', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>

                <div style={{ fontWeight: '800', color: 'var(--text-secondary)' }}>VS</div>

                <div style={{ flex: 1, textAlign: 'center' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    {selectedMatch.away_team?.username}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={awayScore}
                    onChange={(e) => setAwayScore(e.target.value)}
                    style={{ width: '60px', padding: '10px', textAlign: 'center', fontSize: '1.2rem', fontWeight: '800', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setSelectedMatch(null)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" disabled={isUpdatingScore} className="btn btn-primary btn-sm">
                  {isUpdatingScore ? 'Saving...' : 'Save Result'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
