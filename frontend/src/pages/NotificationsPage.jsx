import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationsAPI, getMediaUrl } from '../services/api';
import { BellIcon } from '../components/common/Icons';

export const NotificationsPage = () => {
  const { setUnreadNotifications } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await notificationsAPI.getNotifications();
      setNotifications(res.data.notifications || []);
      // Mark all as read automatically upon viewing
      await notificationsAPI.markAsRead();
      setUnreadNotifications(0);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div className="notifications-container" style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--border-radius)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800' }}>Notifications</h2>
          <button
            onClick={fetchNotifications}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.8rem' }}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>Loading notifications...</div>
        ) : notifications.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {notifications.map((n) => {
              const sender = n.sender || {};
              const avatarUrl = sender.profile_picture ? getMediaUrl(sender.profile_picture) : null;

              return (
                <div
                  key={n.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px',
                    borderRadius: '10px',
                    background: n.is_read ? 'var(--bg-subtle-2)' : 'rgba(0, 217, 255, 0.08)',
                    border: n.is_read ? '1px solid transparent' : '1px solid var(--glass-border)',
                    transition: 'var(--transition)'
                  }}
                >
                  {sender.username ? (
                    <Link to={`/profile/${sender.username}`}>
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={sender.username} style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
                          {sender.username.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </Link>
                  ) : (
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <BellIcon size={20} />
                    </div>
                  )}

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                      {sender.username ? (
                        <Link to={`/profile/${sender.username}`} style={{ fontWeight: '700', color: 'var(--text-primary)', textDecoration: 'none', marginRight: '6px' }}>
                          {sender.username}
                        </Link>
                      ) : null}
                      <span>{n.message}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                      {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {!n.is_read && (
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }}></span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
            <BellIcon size={44} className="empty-icon" />
            <p>You have no notifications right now.</p>
          </div>
        )}
      </div>
    </div>
  );
};
