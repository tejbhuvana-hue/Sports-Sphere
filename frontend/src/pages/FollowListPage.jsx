import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { followsAPI, getMediaUrl } from '../services/api';

export const FollowListPage = ({ type = 'followers' }) => {
  const { username } = useParams();
  const location = useLocation();
  const isFollowingList = type === 'following' || location.pathname.includes('/following/');

  const [users, setUsers] = useState([]);
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchList = async () => {
      setLoading(true);
      try {
        const res = isFollowingList
          ? await followsAPI.getFollowing(username)
          : await followsAPI.getFollowers(username);

        setUsers(res.data.users || []);
        setProfileUser(res.data.profile_user);
      } catch (err) {
        console.error('Failed to load list', err);
      } finally {
        setLoading(false);
      }
    };
    fetchList();
  }, [username, isFollowingList]);

  return (
    <div className="follow-list-container" style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
          <Link to={`/profile/${username}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '1.1rem' }}>
            &larr;
          </Link>
          <h2 style={{ fontSize: '1.3rem', fontWeight: '800' }}>
            {isFollowingList ? `People @${username} Follows` : `Followers of @${username}`}
          </h2>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-secondary)' }}>Loading...</div>
        ) : users.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {users.map((u) => {
              const avatarUrl = u.profile_picture ? getMediaUrl(u.profile_picture) : null;
              return (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-subtle-2)', borderRadius: '8px' }}>
                  <Link to={`/profile/${u.username}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'inherit' }}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={u.username} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
                        {u.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {u.username}
                        {u.is_verified && (
                          <svg className="verified-badge" viewBox="0 0 24 24" width="12" height="12" fill="var(--accent)">
                            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {u.role} {u.sport ? `• ${u.sport}` : ''}
                      </div>
                    </div>
                  </Link>

                  <Link to={`/profile/${u.username}`} className="btn btn-secondary btn-sm" style={{ fontSize: '0.78rem' }}>
                    View Profile
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-secondary)' }}>
            No {isFollowingList ? 'following' : 'followers'} to show.
          </div>
        )}
      </div>
    </div>
  );
};
