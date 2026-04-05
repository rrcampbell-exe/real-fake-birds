'use client';

import { useEffect } from 'react';
import { AccountStateProvider } from '@/components/account/AccountStateProvider';
import { finch } from '@/lib/themes';
import { useSound } from '@/hooks/useSound';
import { useStoredJson } from '@/hooks/useStoredValue';
import IosWebAudioNotice from '@/components/IosWebAudioNotice';
import { migrateStoredPlayerProgress } from '@/lib/utils/player-progress';
import { resolveTheme, setTheme } from '@/lib/utils/theme-handler';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const storedTheme = useStoredJson('birdTheme', finch);
  const currentTheme = resolveTheme(storedTheme);
  const { startThemeSong, stopThemeSong, isMusicMuted } = useSound();

  useEffect(() => {
    migrateStoredPlayerProgress();
  }, []);

  useEffect(() => {
    if (storedTheme.name !== currentTheme.name || storedTheme.themeSong !== currentTheme.themeSong || storedTheme.primary !== currentTheme.primary || storedTheme.secondary !== currentTheme.secondary || storedTheme.textColor !== currentTheme.textColor || storedTheme.realFakeTextColor !== currentTheme.realFakeTextColor) {
      setTheme(currentTheme);
    }
  }, [currentTheme, storedTheme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme.name);
  }, [currentTheme]);

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
    </AccountStateProvider>
  );
}
