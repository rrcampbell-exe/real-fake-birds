import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAPACITOR_SERVER_URL ?? 'https://realfakebirds.app';
const allowCleartext = serverUrl.startsWith('http://');

const config: CapacitorConfig = {
  appId: 'com.realfakebirds.app',
  appName: 'Real Fake Birds',
  webDir: 'out',
  server: {
    url: serverUrl,
    cleartext: allowCleartext,
  },
  ios: {
    contentInset: 'never',
    scrollEnabled: true,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: false,
      backgroundColor: '#1B5C1B',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
