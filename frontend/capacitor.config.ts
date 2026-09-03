import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sportssphere.app',
  appName: 'SportsSphere',
  webDir: 'dist',

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#000000",
      showSpinner: false
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: "596687791143-1vsd1ekqjg29gdv0k3h1bjfjvudrl0jj.apps.googleusercontent.com",
      forceCodeForRefreshToken: false
    }
  }
};

export default config;