import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

// Web Client ID (from Firebase Console -> Authentication -> Sign-in method -> Google, or Google Cloud OAuth Credentials)
const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  import.meta.env.VITE_FIREBASE_WEB_CLIENT_ID ||
  '';

let isInitialized = false;

/**
 * Initializes Google Auth plugin for Capacitor native and Web environments.
 */
export const initGoogleAuth = async () => {
  if (isInitialized) return;

  try {
    if (Capacitor.isNativePlatform()) {
      await GoogleAuth.initialize({
        clientId: GOOGLE_CLIENT_ID || undefined,
        scopes: ['profile', 'email'],
        grantOfflineAccess: false,
      });
      isInitialized = true;
      console.log('[GoogleAuth] Native GoogleAuth initialized successfully.');
    } else {
      // In web browser environment
      if (GOOGLE_CLIENT_ID) {
        await loadGsiScript();
        isInitialized = true;
        console.log('[GoogleAuth] Web Google Identity Services initialized.');
      }
    }
  } catch (err) {
    console.warn('[GoogleAuth] Notice during GoogleAuth initialization:', err);
  }
};

/**
 * Loads the Google Identity Services (GIS) client script if in web browser.
 */
const loadGsiScript = () => {
  return new Promise((resolve) => {
    if (window.google?.accounts?.id) {
      return resolve();
    }
    const existingScript = document.getElementById('gsi-client');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.id = 'gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      console.warn('[GoogleAuth] Failed to load Google Identity Services script.');
      resolve();
    };
    document.head.appendChild(script);
  });
};

/**
 * Initiates Google Sign-In and returns the verified Google ID Token.
 *
 * @returns {Promise<string>} The Google ID token string
 */
export const performGoogleSignIn = async () => {
  // If native Android/iOS
  if (Capacitor.isNativePlatform()) {
    try {
      await initGoogleAuth();
      const user = await GoogleAuth.signIn();
      const idToken = user?.authentication?.idToken || user?.idToken;
      if (!idToken) {
        throw new Error('No ID token received from Google native sign-in.');
      }
      return idToken;
    } catch (nativeErr) {
      console.error('[GoogleAuth] Native Google Sign-In error:', nativeErr);
      throw nativeErr;
    }
  }

  // If Web environment
  await loadGsiScript();

  if (!window.google?.accounts?.id) {
    throw new Error('Google Identity Services is not available. Please check your internet connection.');
  }

  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google Client ID is not configured in environment variables (VITE_GOOGLE_CLIENT_ID).');
  }

  return new Promise((resolve, reject) => {
    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response?.credential) {
            resolve(response.credential);
          } else {
            reject(new Error('No credential returned from Google Sign-In.'));
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Prompt the user with One Tap / Google account chooser
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.warn('[GoogleAuth] Prompt skipped or not displayed:', notification.getNotDisplayedReason?.());
        }
      });
    } catch (err) {
      reject(err);
    }
  });
};
