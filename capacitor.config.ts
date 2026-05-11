import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAPACITOR_SERVER_URL;
const allowCleartext = serverUrl?.startsWith('http://') ?? false;
const usesProductionHostedWebApp = serverUrl === 'https://www.realfakebirds.app'
  || serverUrl === 'https://realfakebirds.app';
const useManualSplashHandoff = usesProductionHostedWebApp;

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
      // Keep manual splash control only for the production hosted app. Localhost
      // and LAN builds should fail open instead of trapping on splash when the
      // device cannot reach the dev server.
      launchShowDuration: useManualSplashHandoff ? 500 : 2000,
      launchAutoHide: !useManualSplashHandoff,
      backgroundColor: '#1B5C1B',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
