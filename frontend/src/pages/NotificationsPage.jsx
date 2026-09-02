import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationsAPI, getMediaUrl } from '../services/api';
import { BellIcon, TrashIcon, MessagesIcon, HeartIcon, CommentIcon } from '../components/common/Icons';

export const NotificationsPage = () => {
  const { setUnreadNotifications } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await notificationsAPI.getNotifications();
      setNotifications(res.data.notifications || []);
      // Automatically mark as read upon viewing
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

  const handleClearAll = async () => {
    if (notifications.length === 0 || isClearing) return;
    setIsClearing(true);
    try {
      await notificationsAPI.clearAll();
      setNotifications([]);
      setUnreadNotifications(0);
    } catch (err) {
      console.error('Failed to clear notifications', err);
    } finally {
      setIsClearing(false);
    }
  };

  const handleDeleteOne = async (e, id) => {
    e.stopPropagation();
    try {
      await notificationsAPI.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  const handleNotificationClick = (n) => {
    const type = n.notification_type;
    const sender = n.sender;
    const post = n.post;

    if (type === 'MESSAGE' && sender?.username) {
      navigate(`/messages/${sender.username}`);
    } else if (type === 'FOLLOW' && sender?.username) {
      navigate(`/profile/${sender.username}`);
    } else if ((type === 'LIKE' || type === 'COMMENT') && post) {
      const postId = typeof post === 'object' ? post.id : post;
      navigate(`/feed?post=${postId}`);
    } else if (sender?.username) {
      navigate(`/profile/${sender.username}`);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'MESSAGE':
        return <MessagesIcon size={16} />;
      case 'LIKE':
        return <HeartIcon size={16} fill="currentColor" />;
      case 'COMMENT':
        return <CommentIcon size={16} />;
      default:
        return <BellIcon size={16} />;
    }
  };

  return (
    <div className="notifications-container">
      <div className="notifications-panel glass-panel">
        <div className="notifications-header">
          <h2 className="notifications-title">Notifications</h2>
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              disabled={isClearing}
              className="btn btn-secondary btn-sm notif-clear-btn"
              title="Clear all notifications"
            >
              <TrashIcon size={14} />
              <span>{isClearing ? 'Clearing...' : 'Clear All'}</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="notifications-loading">Loading notifications...</div>
        ) : notifications.length > 0 ? (
          <div className="notifications-list">
            {notifications.map((n) => {
              const sender = n.sender || {};
              const avatarUrl = sender.profile_picture ? getMediaUrl(sender.profile_picture) : null;
              const displayName = sender.first_name ? `${sender.first_name} ${sender.last_name || ''}`.trim() : sender.username;

              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`notification-item ${n.is_read ? 'read' : 'unread'}`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleNotificationClick(n);
                    }
                  }}
                >
                  <div className="notif-avatar-wrapper">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={sender.username || 'User'} className="notif-avatar-img" />
                    ) : (
                      <div className="notif-avatar-placeholder">
                        {sender.username ? sender.username.slice(0, 2).toUpperCase() : <BellIcon size={18} />}
                      </div>
                    )}
                    <span className={`notif-type-badge notif-type-${(n.notification_type || 'system').toLowerCase()}`}>
                      {getNotificationIcon(n.notification_type)}
                    </span>
                  </div>

                  <div className="notif-content">
                    <div className="notif-message-row">
                      {sender.username && (
                        <span className="notif-sender-name">
                          {displayName || sender.username}
                        </span>
                      )}
                      <span className="notif-text">{n.message}</span>
                    </div>
                    <span className="notif-time">
                      {new Date(n.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <div className="notif-actions">
                    {!n.is_read && <span className="notif-unread-dot"></span>}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteOne(e, n.id)}
                      className="notif-delete-btn"
                      title="Delete notification"
                      aria-label="Delete notification"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-notif-state">
            <div className="empty-notif-icon">
              <BellIcon size={44} />
            </div>
            <h3>No notifications yet</h3>
            <p>You have no notifications right now.</p>
          </div>
        )}
      </div>
    </div>
  );
};
