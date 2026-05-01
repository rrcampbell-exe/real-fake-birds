import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAPACITOR_SERVER_URL;
const allowCleartext = serverUrl?.startsWith('http://') ?? false;
const usesRemoteWebServer = Boolean(serverUrl);

const config: CapacitorConfig = {
  appId: 'com.realfakebirds.app',
  appName: 'Real Fake Birds',
  webDir: 'out',
  // Allow navigation within both apex and www to survive any redirect chains.
  // Capacitor's WKNavigationDelegate opens non-matching hosts in the external
  // browser, which would happen if the server URL 308-redirects to www (or vice versa).
  server: {
    ...(serverUrl ? { url: serverUrl, cleartext: allowCleartext } : {}),
    allowNavigation: ['realfakebirds.app', 'www.realfakebirds.app'],
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
      // When running against a remote dev/prod web server URL, prefer native
      // auto-hide so failed JS hydration cannot trap the app on splash.
      launchAutoHide: usesRemoteWebServer,
      backgroundColor: '#1B5C1B',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
