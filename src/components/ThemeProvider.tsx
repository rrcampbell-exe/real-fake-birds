'use client';

import { useEffect } from 'react';
import { AccountStateProvider } from '@/components/account/AccountStateProvider';
import WeeklyChallengeRecapModal from '@/components/account/WeeklyChallengeRecapModal';
import { finch } from '@/lib/themes';
import { useSound } from '@/hooks/useSound';
import { useStoredJson } from '@/hooks/useStoredValue';
import IosWebAudioNotice from '@/components/IosWebAudioNotice';
import { migrateStoredPlayerProgress } from '@/lib/utils/player-progress';
import { resolveTheme, setTheme } from '@/lib/utils/theme-handler';
import { isNativePlatform } from '@/lib/native/platform';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const storedTheme = useStoredJson('birdTheme', finch);
  const currentTheme = resolveTheme(storedTheme);
  const { startThemeSong, stopThemeSong, isMusicMuted } = useSound();

  useEffect(() => {
    migrateStoredPlayerProgress();
  }, []);

  useEffect(() => {
    if (storedTheme.name !== currentTheme.name || storedTheme.themeSong !== currentTheme.themeSong || storedTheme.primary !== currentTheme.primary || storedTheme.secondary !== currentTheme.secondary || storedTheme.textColor !== currentTheme.textColor) {
      setTheme(currentTheme);
    }
  }, [currentTheme, storedTheme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme.name);
    // Keep the theme-color meta tag in sync so the browser/OS chrome
    // (status bar, task switcher) matches the active theme.
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) {
      meta.content = currentTheme.primary;
    }
  }, [currentTheme]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    const applyNativeShellFlag = () => {
      if (isNativePlatform()) {
        root.setAttribute('data-native-shell', 'true');
        body?.setAttribute('data-native-shell', 'true');
        return true;
      }

      root.removeAttribute('data-native-shell');
      body?.removeAttribute('data-native-shell');
      return false;
    };

    if (applyNativeShellFlag()) {
      return;
    }

    // In iOS simulator/device, the bridge can initialize slightly after mount.
    // Retry briefly so native-only CSS gates activate reliably.
    let attempts = 0;
    const maxAttempts = 20;
    const timer = window.setInterval(() => {
      attempts += 1;
      const applied = applyNativeShellFlag();
      if (applied || attempts >= maxAttempts) {
        window.clearInterval(timer);
      }
    }, 100);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (currentTheme.themeSong && !isMusicMuted) {
      startThemeSong(currentTheme.themeSong);
      return;
    }

    stopThemeSong();
  }, [currentTheme.themeSong, isMusicMuted, startThemeSong, stopThemeSong]);

  useEffect(() => () => stopThemeSong(), [stopThemeSong]);

  return (
    <AccountStateProvider>
      <IosWebAudioNotice />
      {children}
      <WeeklyChallengeRecapModal />
    </AccountStateProvider>
  );
}
