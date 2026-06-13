import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zdechets.app',
  appName: '0Déchets',
  webDir: 'public',
  server: {
    // Load the live website — web updates deploy instantly without store re-review
    url: 'https://www.0dechets.com',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      backgroundColor: '#f97316',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#00000000',
      overlaysWebView: true,
    },
  },
  android: {
    backgroundColor: '#f97316',
  },
};

export default config;
