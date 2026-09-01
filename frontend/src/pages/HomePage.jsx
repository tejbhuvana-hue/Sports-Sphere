import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postsAPI, tournamentsAPI, recruitmentAPI, getMediaUrl, followsAPI } from '../services/api';
import { PostCard } from '../components/PostCard';
import {
  ZapIcon,
  TrophyIcon,
  TargetIcon,
  HandshakeIcon,
  BellIcon,
  MessagesIcon,
  SearchIcon,
  UsersGroupIcon,
  CalendarIcon,
  MapPinIcon,
  PlusIcon,
  ChevronRightIcon,
  UserIcon,
  CheckVerifiedIcon
} from '../components/common/Icons';

export const HomePage = ({ onOpenCreatePost }) => {
  const { user, unreadNotifications, unreadMessages } = useAuth();

  const [suggestedProfiles, setSuggestedProfiles] = useState([]);
  const [trendingAthletes, setTrendingAthletes] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [discoverPosts, setDiscoverPosts] = useState([]);
  const [activeTournaments, setActiveTournaments] = useState([]);
  const [recentTrials, setRecentTrials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState({});

  const fetchHomeData = async () => {
    setLoading(true);
    try {
      // 1. Fetch widgets data (suggested profiles, trending athletes, upcoming events)
      const [widgetsRes, postsRes, tournamentsRes, trialsRes] = await Promise.allSettled([
        postsAPI.getWidgets(),
        postsAPI.getPosts(),
        tournamentsAPI.getTournaments(),
        recruitmentAPI.getPostings()
      ]);

      if (widgetsRes.status === 'fulfilled') {
        setSuggestedProfiles(widgetsRes.value.data.suggested_profiles || []);
        setTrendingAthletes(widgetsRes.value.data.trending_athletes || []);
        setUpcomingEvents(widgetsRes.value.data.upcoming_events || []);
      }

      if (postsRes.status === 'fulfilled') {
        // Randomize/shuffle posts for dynamic discovery
        const allPosts = postsRes.value.data || [];
        const shuffled = [...allPosts].sort(() => 0.5 - Math.random());
        setDiscoverPosts(shuffled.slice(0, 8));
      }

      if (tournamentsRes.status === 'fulfilled') {
        setActiveTournaments(tournamentsRes.value.data?.slice(0, 3) || []);
      }

      if (trialsRes.status === 'fulfilled') {
        setRecentTrials(trialsRes.value.data?.slice(0, 3) || []);
      }
    } catch (err) {
      console.error('Failed to load Home dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomeData();
  }, []);

  const handleToggleFollow = async (userId) => {
    try {
      await followsAPI.toggleFollow(userId);
      setFollowingMap((prev) => ({ ...prev, [userId]: !prev[userId] }));
    } catch (err) {
      console.error('Follow toggle error', err);
    }
  };

  const myAvatarUrl = user?.profile?.profile_picture ? getMediaUrl(user.profile.profile_picture) : null;

  return (
    <div className="home-dashboard-container">
      {/* 1. TOP STORIES / SUGGESTED PROFILES CAROUSEL */}
      <section className="home-stories-section">
        <div className="home-stories-track">
          {/* User's own story / quick post circle */}
          <div
            className="home-story-item home-my-story"
            onClick={onOpenCreatePost}
            title="Create a new post"
          >
            <div className="home-story-avatar-wrap my-story-wrap">
              {myAvatarUrl ? (
                <img src={myAvatarUrl} alt={user?.username} className="home-story-avatar" />
              ) : (
                <div className="home-story-placeholder">
                  {user?.username ? user.username.slice(0, 2).toUpperCase() : 'ME'}
                </div>
              )}
              <span className="my-story-add-badge">
                <PlusIcon size={12} color="#ffffff" strokeWidth={3} />
              </span>
            </div>
            <span className="home-story-username">You</span>
          </div>

          {/* Suggested & Trending Profiles */}
          {suggestedProfiles.map((p) => {
            const avatar = p.profile_picture ? getMediaUrl(p.profile_picture) : null;
            return (
              <Link
                key={p.id}
                to={`/profile/${p.username}`}
                className="home-story-item"
                title={`@${p.username} • ${p.role}`}
              >
                <div className="home-story-avatar-wrap">
                  {avatar ? (
                    <img src={avatar} alt={p.username} className="home-story-avatar" />
                  ) : (
                    <div className="home-story-placeholder">
                      {p.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {p.is_verified && (
                    <span className="home-story-verified">
                      <CheckVerifiedIcon size={12} />
                    </span>
                  )}
                </div>
                <span className="home-story-username">{p.username}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 2. ACTIVITY RADAR & QUICK ACTIONS BAR */}
      <section className="home-quick-hub glass-panel">
        <div className="home-hub-header">
          <h3 className="home-hub-title">
            <ZapIcon size={18} /> Quick Hub
          </h3>
          <span className="home-user-greeting">
            Welcome, <strong>{user?.username}</strong>
          </span>
        </div>

        <div className="home-hub-actions-grid">
          <Link to="/messages" className="home-hub-card">
            <div className="home-hub-icon-wrap" style={{ background: 'rgba(0, 217, 255, 0.12)', color: 'var(--accent)' }}>
              <MessagesIcon size={22} />
              {unreadMessages > 0 && <span className="home-hub-badge">{unreadMessages}</span>}
            </div>
            <div className="home-hub-info">
              <span className="home-hub-label">Messages</span>
              <span className="home-hub-sub">{unreadMessages > 0 ? `${unreadMessages} new` : 'Chat direct'}</span>
            </div>
          </Link>

          <Link to="/recruitment" className="home-hub-card">
            <div className="home-hub-icon-wrap" style={{ background: 'rgba(0, 230, 118, 0.12)', color: '#00e676' }}>
              <TargetIcon size={22} />
            </div>
            <div className="home-hub-info">
              <span className="home-hub-label">Club Trials</span>
              <span className="home-hub-sub">{recentTrials.length} Openings</span>
            </div>
          </Link>

          <Link to="/tournaments" className="home-hub-card">
            <div className="home-hub-icon-wrap" style={{ background: 'rgba(255, 179, 0, 0.12)', color: '#ffb300' }}>
              <TrophyIcon size={22} />
            </div>
            <div className="home-hub-info">
              <span className="home-hub-label">Leagues</span>
              <span className="home-hub-sub">Championships</span>
            </div>
          </Link>

          <Link to="/explore" className="home-hub-card">
            <div className="home-hub-icon-wrap" style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#a855f7' }}>
              <SearchIcon size={22} />
            </div>
            <div className="home-hub-info">
              <span className="home-hub-label">Explore</span>
              <span className="home-hub-sub">Athletes & Clubs</span>
            </div>
          </Link>
        </div>
      </section>

      {/* 3. SPOTLIGHT TRENDING ATHLETES */}
      {trendingAthletes.length > 0 && (
        <section className="home-section">
          <div className="home-section-header">
            <h3 className="home-section-title">
              <ZapIcon size={18} /> Spotlight & Trending Athletes
            </h3>
            <Link to="/explore" className="home-section-more">
              View All <ChevronRightIcon size={16} />
            </Link>
          </div>

          <div className="home-trending-cards-grid">
            {trendingAthletes.map((ath) => {
              const avatar = ath.profile_picture ? getMediaUrl(ath.profile_picture) : null;
              const isFollowing = followingMap[ath.id];
              return (
                <div key={ath.id} className="home-athlete-card glass-panel">
                  <div className="home-athlete-top">
                    <Link to={`/profile/${ath.username}`}>
                      {avatar ? (
                        <img src={avatar} alt={ath.username} className="home-athlete-avatar" />
                      ) : (
                        <div className="home-athlete-avatar-placeholder">
                          {ath.username.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </Link>
                    <span className="home-athlete-tag">
                      <ZapIcon size={10} /> Trending
                    </span>
                  </div>

                  <Link to={`/profile/${ath.username}`} className="home-athlete-name">
                    {ath.username}
                    {ath.is_verified && <CheckVerifiedIcon size={13} />}
                  </Link>

                  <div className="home-athlete-meta">
                    {ath.sport || ath.role || 'Athlete'}
                  </div>

                  <div className="home-athlete-actions">
                    <button
                      onClick={() => handleToggleFollow(ath.id)}
                      className={`btn btn-sm ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                      style={{ width: '100%', fontSize: '0.78rem', padding: '6px 10px' }}
                    >
                      {isFollowing ? 'Following ✓' : '+ Follow'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. UPCOMING EVENTS & CHAMPIONSHIPS CAROUSEL */}
      {(upcomingEvents.length > 0 || activeTournaments.length > 0) && (
        <section className="home-section">
          <div className="home-section-header">
            <h3 className="home-section-title">
              <TrophyIcon size={18} /> Upcoming Tournaments & Matchdays
            </h3>
            <Link to="/tournaments" className="home-section-more">
              All Leagues <ChevronRightIcon size={16} />
            </Link>
          </div>

          <div className="home-events-grid">
            {activeTournaments.map((t) => (
              <Link
                key={t.id}
                to={`/tournaments/${t.id}`}
                className="home-event-card glass-panel"
              >
                <div className="home-event-category">
                  <TrophyIcon size={12} /> {t.sport || 'Tournament'}
                </div>
                <h4 className="home-event-title">{t.name}</h4>
                <div className="home-event-footer">
                  <span className="home-event-detail">
                    <CalendarIcon size={13} /> {t.start_date}
                  </span>
                  <span className="home-event-detail">
                    <MapPinIcon size={13} /> {t.venue}
                  </span>
                </div>
              </Link>
            ))}

            {upcomingEvents.map((evt, idx) => (
              <div key={idx} className="home-event-card glass-panel">
                <div className="home-event-category">
                  <CalendarIcon size={12} /> {evt.category}
                </div>
                <h4 className="home-event-title">{evt.title}</h4>
                <div className="home-event-footer">
                  <span className="home-event-detail">
                    <CalendarIcon size={13} /> {evt.date}
                  </span>
                  <span className="home-event-detail">
                    <MapPinIcon size={13} /> {evt.location}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. DISCOVER & COMMUNITY HIGHLIGHTS STREAM */}
      <section className="home-section">
        <div className="home-section-header">
          <h3 className="home-section-title">
            <UsersGroupIcon size={18} /> Community Highlights & Recent Activity
          </h3>
          <Link to="/feed" className="home-section-more">
            Full Feed <ChevronRightIcon size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="home-loading-box">
            Loading your SportsSphere feed...
          </div>
        ) : discoverPosts.length > 0 ? (
          <div className="home-posts-list">
            {discoverPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="glass-panel home-empty-card">
            No posts found yet. Be the first to share an update!
          </div>
        )}
      </section>
    </div>
  );
};
