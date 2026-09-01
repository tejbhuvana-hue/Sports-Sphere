import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postsAPI, followsAPI, getMediaUrl } from '../services/api';
import { ZapIcon, CalendarIcon, MapPinIcon } from './common/Icons';

export const RightSidebar = () => {
  const { user, isAuthenticated } = useAuth();
  const [suggestedProfiles, setSuggestedProfiles] = useState([]);
  const [trendingAthletes, setTrendingAthletes] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [followingMap, setFollowingMap] = useState({});

  const fetchWidgets = async () => {
    try {
      const res = await postsAPI.getWidgets();
      setSuggestedProfiles(res.data.suggested_profiles || []);
      setTrendingAthletes(res.data.trending_athletes || []);
      setUpcomingEvents(res.data.upcoming_events || []);
    } catch (err) {
      console.warn('Failed to load sidebar widgets', err);
    }
  };

  useEffect(() => {
    fetchWidgets();
  }, []);

  const handleFollowToggle = async (targetUser) => {
    if (!isAuthenticated) return;
    try {
      const res = await followsAPI.toggleFollow(targetUser.id);
      setFollowingMap((prev) => ({
        ...prev,
        [targetUser.id]: res.data.followed,
      }));
    } catch (err) {
      console.error('Follow toggle error', err);
    }
  };

  return (
    <aside className="right-sidebar">
      {/* Suggested Profiles */}
      <section className="widget-panel glass-panel">
        <h3 className="widget-title">Suggested Profiles</h3>
        <div className="widget-list">
          {suggestedProfiles.map((p) => {
            const isFollowing = followingMap[p.id] ?? false;
            const avatarUrl = p.profile_picture ? getMediaUrl(p.profile_picture) : null;

            return (
              <div key={p.id} className="widget-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <Link to={`/profile/${p.username}`} className="widget-item-info" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={p.username} className="avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div className="avatar" style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      color: 'var(--btn-primary-text)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '800',
                      fontSize: '0.75rem'
                    }}>
                      {p.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="widget-item-name" style={{ fontWeight: '600', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {p.username}
                      {p.is_verified && (
                        <svg className="verified-badge" viewBox="0 0 24 24" width="12" height="12" fill="var(--accent)">
                          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      )}
                    </div>
                    <div className="widget-meta" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {p.role} {p.sport ? `• ${p.sport}` : ''}
                    </div>
                  </div>
                </Link>

                {isAuthenticated && user?.id !== p.id && (
                  <button
                    onClick={() => handleFollowToggle(p)}
                    className={`btn ${isFollowing ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
            );
          })}
          {suggestedProfiles.length === 0 && (
            <div className="widget-meta" style={{ textAlign: 'center', padding: '10px 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              No suggestions available
            </div>
          )}
        </div>
      </section>

      {/* Trending Athletes */}
      <section className="widget-panel glass-panel">
        <h3 className="widget-title">Trending Athletes</h3>
        <div className="widget-list">
          {trendingAthletes.map((ath) => {
            const avatarUrl = ath.profile_picture ? getMediaUrl(ath.profile_picture) : null;
            return (
              <div key={ath.id} className="widget-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <Link to={`/profile/${ath.username}`} className="widget-item-info" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={ath.username} className="avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div className="avatar" style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      color: 'var(--btn-primary-text)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '800',
                      fontSize: '0.75rem'
                    }}>
                      {ath.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="widget-item-name" style={{ fontWeight: '600', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {ath.username}
                      {ath.is_verified && (
                        <svg className="verified-badge" viewBox="0 0 24 24" width="12" height="12" fill="var(--accent)">
                          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      )}
                    </div>
                    <div className="widget-meta" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {ath.sport || 'Athlete'}
                    </div>
                  </div>
                </Link>
                <span className="widget-item-tag" style={{ fontSize: '0.72rem', background: 'rgba(255, 107, 0, 0.1)', color: '#ff6b00', padding: '2px 8px', borderRadius: '12px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <ZapIcon size={11} /> Trending
                </span>
              </div>
            );
          })}
          {trendingAthletes.length === 0 && (
            <div className="widget-meta" style={{ textAlign: 'center', padding: '10px 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              No active athletes yet
            </div>
          )}
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="widget-panel glass-panel">
        <h3 className="widget-title">Upcoming Events</h3>
        <div className="widget-list">
          {upcomingEvents.map((evt, idx) => (
            <div key={idx} className="widget-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px', borderBottom: '1px solid var(--border-subtle-2)', paddingBottom: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: '700' }}>
                {evt.category}
              </span>
              <span style={{ fontWeight: '600', fontSize: '0.88rem' }}>{evt.title}</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CalendarIcon size={12} /> {evt.date}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><MapPinIcon size={12} /> {evt.location}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
};
