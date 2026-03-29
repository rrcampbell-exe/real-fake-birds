import type { Metadata } from "next";
import { Fredoka, DM_Sans } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import TopNav from "@/components/nav/TopNav";
import BottomNav from "@/components/nav/BottomNav";

const themeBootstrapScript = `
  (() => {
    try {
      const stored = window.localStorage.getItem('birdTheme');
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed.name === 'string') {
        document.documentElement.setAttribute('data-theme', parsed.name);
      }
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
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="flex min-h-dvh flex-col font-[family-name:var(--font-body)]">
        <ThemeProvider>
          <TopNav />
          <main className="flex flex-1 flex-col pb-16 md:pb-0">
            {children}
          </main>
          <BottomNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
