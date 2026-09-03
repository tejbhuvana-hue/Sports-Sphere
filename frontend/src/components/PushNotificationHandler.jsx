import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  initPushNotifications,
  syncDeviceTokenWithBackend,
  isPushSupported,
  getStoredPushToken
} from '../services/pushNotifications';

/**
 * PushNotificationHandler Component
 *
 * Provides a clean bridge between Capacitor native push notifications and
 * the React application state & routing:
 * - Safe on web and native (no-op in standard web browser).
 * - Automatically initializes push notification channels and permissions on Android.
 * - Synchronizes the device FCM token with the Django backend upon authentication.
 * - Handles foreground notifications by updating unread counts.
 * - Handles notification click/tap actions by deep-linking to corresponding app routes.
 * - Renders nothing to DOM (non-visual component).
 */
export const PushNotificationHandler = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshUser, setUnreadNotifications, setUnreadMessages } = useAuth();

  useEffect(() => {
    let cleanupFn = () => {};

    const setup = async () => {
      cleanupFn = await initPushNotifications({
        // 1. Success callback with FCM Device Token
        onRegistration: (fcmToken) => {
          if (localStorage.getItem('token')) {
            syncDeviceTokenWithBackend(fcmToken).catch(() => {});
          }
        },

        // 2. Error callback
        onRegistrationError: (error) => {
          // Logged to console in push notification service
        },

        // 3. Foreground notification received while app is active
        onNotificationReceived: (notification) => {
          // Update notification counters if user is logged in
          if (refreshUser) {
            refreshUser().catch(() => {});
          } else if (setUnreadNotifications) {
            setUnreadNotifications((prev) => prev + 1);
          }
        },

        // 4. User tapped on a push notification (deep-linking)
        onNotificationActionPerformed: (action) => {
          const data = action.notification?.data || {};

          // Direct route navigation support (e.g. data: { route: '/messages/alex' })
          if (data.route && typeof data.route === 'string') {
            navigate(data.route);
            return;
          }

          // Direct path navigation support (e.g. data: { url: '/feed' })
          if (data.url && typeof data.url === 'string' && data.url.startsWith('/')) {
            navigate(data.url);
            return;
          }

          // Notification type-based routing
          const notifType = data.type || data.notification_type;
          if (notifType === 'MESSAGE' && (data.username || data.sender_username)) {
            navigate(`/messages/${data.username || data.sender_username}`);
          } else if (notifType === 'FOLLOW' && (data.username || data.sender_username)) {
            navigate(`/profile/${data.username || data.sender_username}`);
          } else if ((notifType === 'LIKE' || notifType === 'COMMENT') && (data.postId || data.post_id)) {
            navigate(`/feed?post=${data.postId || data.post_id}`);
          } else if (notifType) {
            navigate('/notifications');
          }
        },
      });
    };

    setup();

    // Cleanup listeners on unmount
    return () => {
      if (typeof cleanupFn === 'function') {
        cleanupFn();
      }
    };
  }, [navigate, refreshUser, setUnreadNotifications, setUnreadMessages]);

  // Whenever an authenticated user is active (login, registration, or app launch with saved session),
  // obtain the existing stored FCM token and register it with Django.
  useEffect(() => {
    if (isAuthenticated && user && isPushSupported()) {
      const storedToken = getStoredPushToken();
      if (storedToken) {
        syncDeviceTokenWithBackend(storedToken).catch(() => {});
      }
    }
  }, [isAuthenticated, user]);

  return null;
};
