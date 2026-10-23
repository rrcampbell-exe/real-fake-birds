import React from 'react';
import { createRoot } from 'react-dom/client';
import './native.css';
import '../src/app/globals.css';
import AnalyticsProvider from '../src/components/analytics/AnalyticsProvider';
import ConsentModal from '../src/components/analytics/ConsentModal';
import BottomNav from '../src/components/nav/BottomNav';
import TopNav from '../src/components/nav/TopNav';
import NativeAuthGate from '../src/components/native/NativeAuthGate';
import NativeBackHandler from '../src/components/native/NativeBackHandler';
import NativeMainWrapper from '../src/components/native/NativeMainWrapper';
import NativeSplashHandler from '../src/components/native/NativeSplashHandler';
import ThemeProvider from '../src/components/ThemeProvider';
import ErrorBoundary from '../src/components/ErrorBoundary';
import NativeAuthCallbackHandler from './NativeAuthCallbackHandler';
import { NativeRouterProvider, usePathname } from './next-runtime';
import HomePage from '../src/app/page';
import BirdhousePage from '../src/app/birdhouse/page';
import CommunityPage from '../src/app/community/page';
import DailyPage from '../src/app/daily/page';
import JournalPage from '../src/app/journal/page';
import LeaderboardPage from '../src/app/leaderboard/page';
import PrivacyPage from '../src/app/privacy/page';
import ProfilePage from '../src/app/profile/page';
import PublicProfilePage from '../src/app/profile/[username]/page';
import PublicBirdhousePage from '../src/app/profile/[username]/birdhouse/page';
import ResetPasswordPage from '../src/app/auth/reset-password/page';
import SettingsPage from '../src/app/settings/page';
import TermsPage from '../src/app/terms/page';

function NativeRoute() {
  const pathname = usePathname();
  const profileBirdhouseMatch = pathname.match(/^\/profile\/([^/]+)\/birdhouse\/?$/);
  const profileMatch = pathname.match(/^\/profile\/([^/]+)\/?$/);

  let page: React.ReactNode;
  if (pathname === '/' || pathname === '/index.html') page = <HomePage />;
  else if (pathname === '/birdhouse') page = <BirdhousePage />;
  else if (pathname === '/community') page = <CommunityPage />;
  else if (pathname === '/daily') page = <DailyPage />;
  else if (pathname === '/journal') page = <JournalPage />;
  else if (pathname === '/leaderboard') page = <LeaderboardPage />;
  else if (pathname === '/privacy') page = <PrivacyPage />;
  else if (pathname === '/profile') page = <ProfilePage />;
  else if (profileBirdhouseMatch) page = <PublicBirdhousePage />;
  else if (profileMatch) page = <PublicProfilePage />;
  else if (pathname === '/auth/reset-password') page = <ResetPasswordPage />;
  else if (pathname === '/auth/callback') page = <p className="p-6 text-center">Completing account sign-in…</p>;
  else if (pathname === '/settings' || pathname === '/menu') page = <SettingsPage />;
  else if (pathname === '/terms') page = <TermsPage />;
  else page = <HomePage />;

  return (
    <ErrorBoundary>
      <NativeBackHandler />
      <NativeAuthCallbackHandler />
      <NativeSplashHandler />
      <ThemeProvider>
        <AnalyticsProvider />
        <ConsentModal />
        <NativeAuthGate />
        <TopNav />
        <NativeMainWrapper>{page}</NativeMainWrapper>
        <BottomNav />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const rootElement = document.getElementById('app-root');
if (!rootElement) {
  throw new Error('Native app root element was not found.');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <NativeRouterProvider>
      <NativeRoute />
    </NativeRouterProvider>
  </React.StrictMode>,
);
