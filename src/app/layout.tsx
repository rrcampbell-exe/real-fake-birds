import type { Metadata } from "next";
import { Fredoka, DM_Sans } from "next/font/google";
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import TopNav from "@/components/nav/TopNav";
import BottomNav from "@/components/nav/BottomNav";
import AnalyticsProvider from '@/components/analytics/AnalyticsProvider';

const themeBootstrapScript = `
  (() => {
    try {
      const stored = window.localStorage.getItem('birdTheme');
      const score = JSON.parse(window.localStorage.getItem('birdScore') || '{}');
      const birdsIdentified = typeof score?.birdsIdentified === 'number' ? score.birdsIdentified : 0;
      const purchased = JSON.parse(window.localStorage.getItem('unlockedThemes') || '[]');
      const unlockThresholds = [
        ['Raven', 10],
        ['Robin', 25],
        ['Gull', 50],
        ['Crane', 75],
        ['Woodpecker', 100],
        ['Blue Jay', 150],
        ['Oriole', 200],
        ['Heron', 275],
        ['Cardinal', 350],
      ];
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fredoka.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <head>
        <Script
          id="theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
      </head>
      <body className="flex min-h-dvh flex-col font-[family-name:var(--font-body)]">
        <ThemeProvider>
          <AnalyticsProvider />
          <TopNav />
          <main className="flex flex-1 flex-col pb-16 md:pb-0">
            {children}
          </main>
          <BottomNav />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
