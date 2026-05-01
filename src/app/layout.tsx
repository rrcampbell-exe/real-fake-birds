import type { Metadata, Viewport } from "next";
import { Fredoka, DM_Sans } from "next/font/google";
import Script from 'next/script';
import { headers } from 'next/headers';
import { Analytics } from '@vercel/analytics/next';
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import TopNav from "@/components/nav/TopNav";
import BottomNav from "@/components/nav/BottomNav";
import AnalyticsProvider from '@/components/analytics/AnalyticsProvider';
import ConsentModal from '@/components/analytics/ConsentModal';
import { themeUnlocks } from '@/lib/constants/theme-unlocks';
import NativeBackHandler from '@/components/native/NativeBackHandler';
import NativeMainWrapper from '@/components/native/NativeMainWrapper';
import NativeSplashHandler from '@/components/native/NativeSplashHandler';
import NativeAuthGate from '@/components/native/NativeAuthGate';

const liveThemeUnlockThresholds = themeUnlocks
  .filter((themeUnlock) => !themeUnlock.comingSoon)
  .map((themeUnlock) => [themeUnlock.themeName, themeUnlock.milestoneValue]);

const themeBootstrapScript = `
  (() => {
    try {
      document.documentElement.setAttribute('data-app-booting', 'true');
      const applyNativeShellBootstrap = () => {
        const capacitor = window.Capacitor;
        const isNativeShell = Boolean(capacitor?.isNativePlatform?.());

        if (!isNativeShell) {
          return false;
        }

        document.documentElement.setAttribute('data-native-shell', 'true');

        return true;
      };

      if (!applyNativeShellBootstrap()) {
        let nativeShellBootstrapAttempts = 0;
        const nativeShellBootstrapTimer = window.setInterval(() => {
          nativeShellBootstrapAttempts += 1;
          if (applyNativeShellBootstrap() || nativeShellBootstrapAttempts >= 40) {
            window.clearInterval(nativeShellBootstrapTimer);
          }
        }, 50);
      }

      const stored = window.localStorage.getItem('birdTheme');
      const score = JSON.parse(window.localStorage.getItem('birdScore') || '{}');
      const birdsIdentified = typeof score?.birdsIdentified === 'number' ? score.birdsIdentified : 0;
      const purchased = JSON.parse(window.localStorage.getItem('unlockedThemes') || '[]');
      const unlockThresholds = ${JSON.stringify(liveThemeUnlockThresholds)};
      const unlocked = new Set(['Finch']);
      unlockThresholds.forEach(([name, threshold]) => {
        if (birdsIdentified >= threshold) unlocked.add(name);
      });
      if (Array.isArray(purchased)) {
        purchased.forEach((name) => {
          if (typeof name === 'string') unlocked.add(name);
        });
      }
      if (!stored) {
        document.documentElement.setAttribute('data-theme', 'Finch');
        return;
      }
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed.name === 'string' && unlocked.has(parsed.name)) {
        document.documentElement.setAttribute('data-theme', parsed.name);
        return;
      }
      document.documentElement.setAttribute('data-theme', 'Finch');
    } catch {}
  })();
`;

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Real Fake Birds",
  description: "Some are real. Some are fake. Tell them apart.",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1B5C1B',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html lang="en" className={`${fredoka.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <head>
        <Script
          id="theme-bootstrap"
          strategy="beforeInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
      </head>
      <body className="flex min-h-dvh flex-col font-[family-name:var(--font-body)]">
        <NativeBackHandler />
        <NativeSplashHandler />
        <ThemeProvider>
          <AnalyticsProvider />
          <ConsentModal />
          <NativeAuthGate />
          <TopNav />
          <NativeMainWrapper>
            {children}
          </NativeMainWrapper>
          <BottomNav />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
