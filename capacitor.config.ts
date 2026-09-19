import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lumina.studyflow',
  appName: 'StudyFlow',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DEFAULT',
      backgroundColor: '#ffffff',
    },
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      launchFadeOutDuration: 400,
      backgroundColor: "#2c1c98",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: "1048055478088-8rc0hh9t2ihbpdrmmcppe4hak2qrufn2.apps.googleusercontent.com",
      clientId: "1048055478088-8rc0hh9t2ihbpdrmmcppe4hak2qrufn2.apps.googleusercontent.com",
      androidClientId: "1048055478088-bp7mkum60r06b1mc84i5i9jm27en6iau.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
