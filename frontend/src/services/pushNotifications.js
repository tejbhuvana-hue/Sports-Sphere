import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { deviceTokensAPI } from './api';

/**
 * Checks if the Push Notifications plugin is supported and available on current platform.
 * Returns true only on native platforms (e.g. Android, iOS) where the native plugin bridge exists.
 * On standard desktop / mobile browsers, this returns false to safely bypass native calls.
 *
 * @returns {boolean}
 */
export const isPushSupported = () => {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('PushNotifications');
};

/**
 * Initializes Android Notification Channels (required for Android 8.0+ / API 26+).
 * This ensures that incoming push notifications have a properly configured high-importance
 * channel to display sound, heads-up banners, and badge icons on Android devices.
 */
export const setupPushNotificationChannels = async () => {
  if (Capacitor.getPlatform() !== 'android' || !isPushSupported()) return;

  try {
    // Create the default notification channel for SportsSphere
    await PushNotifications.createChannel({
      id: 'default',
      name: 'General Notifications',
      description: 'SportsSphere activity, messages, and social updates',
      importance: 4, // IMPORTANCE_HIGH (makes sound and displays as a heads-up banner)
      visibility: 1, // VISIBILITY_PUBLIC (displays full content on lock screen)
      sound: undefined, // Default system notification sound
      vibration: true,
      lights: true,
      lightColor: '#ff4b2b',
    });
    console.log('[PushNotifications] ✅ Android default notification channel ready.');
  } catch (err) {
    console.warn('[PushNotifications] ⚠️ Notice while setting up notification channel:', err);
  }
};

/**
 * Safely registers the device for push notifications:
 * 1. Verifies the runtime environment (native Android/iOS).
 * 2. Sets up Android notification channels.
 * 3. Registers listeners for registration, registration errors, foreground receipts, and tap actions.
 * 4. Checks current permission state.
 * 5. Prompts the user for permission if not granted.
 * 6. Calls PushNotifications.register() upon permission grant.
 *
 * @param {Object} [options]
 * @param {Function} [options.onRegistration] - Callback with device token string on successful registration
 * @param {Function} [options.onRegistrationError] - Callback with error object if registration fails
 * @param {Function} [options.onNotificationReceived] - Callback with notification payload when received while app is open
 * @param {Function} [options.onNotificationActionPerformed] - Callback with action payload when user taps/clicks notification
 * @returns {Promise<Function>} A cleanup function that removes all attached listeners
 */
export const initPushNotifications = async ({
  onRegistration,
  onRegistrationError,
  onNotificationReceived,
  onNotificationActionPerformed,
} = {}) => {
  // Mobile-safe guard: prevent execution on non-native web/desktop browsers
  if (!isPushSupported()) {
    console.info('[PushNotifications] Push notifications skipped (running in web browser / non-native environment).');
    return () => {};
  }

  // Store listener handles for clean deregistration
  const listenerHandles = [];

  try {
    // Step 1: Configure Android Notification Channel
    await setupPushNotificationChannels();

    // Step 2: Register Event Listeners BEFORE invoking register()
    // This prevents race conditions where token is emitted before listeners are attached.

    // --- Listener 1: Registration Success (FCM Device Token) ---
    const regHandle = await PushNotifications.addListener('registration', (token) => {
      console.log('========================================================');
      console.log('🔥 [SportsSphere Push] Registration Success!');
      const preview = token.value ? `${token.value.slice(0, 8)}...` : 'empty';
      console.log('📱 FCM Device Token registered:', preview);
      console.log('========================================================');

      // Cache the device token in localStorage for easy access/debugging or API sync
      try {
        localStorage.setItem('fcm_token', token.value);
      } catch (storageErr) {
        console.warn('[PushNotifications] Could not cache FCM token in localStorage:', storageErr);
      }

      if (typeof onRegistration === 'function') {
        onRegistration(token.value);
      }
    });
    listenerHandles.push(regHandle);

    // --- Listener 2: Registration Error ---
    const regErrorHandle = await PushNotifications.addListener('registrationError', (error) => {
      console.error('========================================================');
      console.error('❌ [SportsSphere Push] Registration Error:', error);
      console.error('========================================================');

      if (typeof onRegistrationError === 'function') {
        onRegistrationError(error);
      }
    });
    listenerHandles.push(regErrorHandle);

    // --- Listener 3: Notification Received while App is Open (Foreground) ---
    const receivedHandle = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[PushNotifications] 📩 Notification received in foreground:', notification);

      if (typeof onNotificationReceived === 'function') {
        onNotificationReceived(notification);
      }
    });
    listenerHandles.push(receivedHandle);

    // --- Listener 4: Notification Tap / Action Event ---
    const actionHandle = await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[PushNotifications] 👆 Notification tapped / action performed:', action);

      if (typeof onNotificationActionPerformed === 'function') {
        onNotificationActionPerformed(action);
      }
    });
    listenerHandles.push(actionHandle);

    // Step 3: Check notification permission status
    let permStatus = await PushNotifications.checkPermissions();
    console.log('[PushNotifications] Current permission status:', permStatus.receive);

    // Step 4: If not yet granted, request notification permission from user
    if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
      console.log('[PushNotifications] Requesting notification permission...');
      permStatus = await PushNotifications.requestPermissions();
      console.log('[PushNotifications] Requested permission result:', permStatus.receive);
    }

    // Step 5: Register with FCM/APNS if permission is granted
    if (permStatus.receive === 'granted') {
      console.log('[PushNotifications] Permission granted. Registering device with FCM...');
      await PushNotifications.register();
    } else {
      console.warn('[PushNotifications] ⚠️ Notification permission was denied or not granted. Status:', permStatus.receive);
    }

    // Return an idempotent cleanup function to remove attached listeners
    return () => {
      listenerHandles.forEach((handle) => {
        try {
          if (handle && typeof handle.remove === 'function') {
            handle.remove();
          }
        } catch (e) {
          console.warn('[PushNotifications] Error removing listener handle:', e);
        }
      });
    };
  } catch (error) {
    console.error('[PushNotifications] Error during push notification registration:', error);
    return () => {};
  }
};

/**
 * Retrieves the cached FCM device token from local storage (if previously registered).
 *
 * @returns {string|null}
 */
export const getStoredPushToken = () => {
  try {
    return localStorage.getItem('fcm_token');
  } catch {
    return null;
  }
};

/**
 * Synchronizes the FCM device token with the Django backend for the currently authenticated user.
 * Safely guards against non-native web environments and unauthenticated states.
 *
 * @param {string} [explicitToken] - Optional explicit token, falls back to getStoredPushToken()
 * @returns {Promise<boolean>}
 */
export const syncDeviceTokenWithBackend = async (explicitToken = null) => {
  if (!isPushSupported()) return false;

  const token = explicitToken || getStoredPushToken();
  const authToken = localStorage.getItem('token');

  if (!token || !authToken) {
    return false;
  }

  try {
    await deviceTokensAPI.registerToken(token);
    console.log('[PushNotifications] ✅ Device token registered with backend.');
    return true;
  } catch (err) {
    console.warn('[PushNotifications] ⚠️ Could not register device token with backend:', err?.response?.data || err.message);
    return false;
  }
};

/**
 * Unregisters the device token from the Django backend (e.g. upon user logout).
 *
 * @param {string} [explicitToken]
 * @returns {Promise<boolean>}
 */
export const removeDeviceTokenFromBackend = async (explicitToken = null) => {
  if (!isPushSupported()) return false;

  const token = explicitToken || getStoredPushToken();
  const authToken = localStorage.getItem('token');

  if (!token || !authToken) {
    return false;
  }

  try {
    await deviceTokensAPI.deleteToken(token);
    console.log('[PushNotifications] Device token unregistered from backend.');
    return true;
  } catch (err) {
    console.warn('[PushNotifications] Notice during device token deregistration:', err?.response?.data || err.message);
    return false;
  }
};

