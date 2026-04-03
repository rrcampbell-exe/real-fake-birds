'use client';

import { useCallback, useEffect } from 'react';
import { getSoundController } from '@/lib/sound/sound-platform';
import type { SoundKey } from '@/lib/sound/types';
import { finch } from '@/lib/themes';
import type { SoundSettings } from '@/types';
import { useStoredJson } from '@/hooks/useStoredValue';
import { resolveTheme } from '@/lib/utils/theme-handler';

const DEFAULT_SETTINGS: SoundSettings = {
  sfxMuted: false,
  sfxVolume: 0.7,
  musicMuted: false,
  musicVolume: 1,
};

export function useSound() {
  const settings = useStoredJson<SoundSettings>('birdSoundSettings', DEFAULT_SETTINGS);
  const storedTheme = useStoredJson('birdTheme', finch);
  const currentTheme = resolveTheme(storedTheme);

  // Sync reactive stored settings into the SoundManager singleton
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const controller = getSoundController();
    const current = controller.getSettings();
    if (current.sfxMuted !== settings.sfxMuted) controller.setSfxMuted(settings.sfxMuted);
    if (current.sfxVolume !== settings.sfxVolume) controller.setSfxVolume(settings.sfxVolume);
    if (current.musicMuted !== settings.musicMuted) controller.setMusicMuted(settings.musicMuted);
    if (current.musicVolume !== settings.musicVolume) controller.setMusicVolume(settings.musicVolume);
  }, [settings.musicMuted, settings.musicVolume, settings.sfxMuted, settings.sfxVolume]);

  // Preload the active theme song only. Other tracks load on demand when selected.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!currentTheme.themeSong) return;
    void getSoundController().preloadAll([currentTheme.themeSong]);
  }, [currentTheme.themeSong]);

  // Resume AudioContext on first user gesture (iOS / Android requirement)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      void getSoundController().unlock();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const play = useCallback((key: SoundKey) => {
    getSoundController().play(key);
  }, []);

  const startLoop = useCallback((key: SoundKey) => {
    getSoundController().startLoop(key);
  }, []);

  const stopLoop = useCallback((key: SoundKey) => {
    getSoundController().stopLoop(key);
  }, []);

  const startThemeSong = useCallback((url: string) => {
    getSoundController().startThemeSong(url);
  }, []);

  const stopThemeSong = useCallback(() => {
    getSoundController().stopThemeSong();
  }, []);

  const setSfxMuted = useCallback((muted: boolean) => {
    getSoundController().setSfxMuted(muted);
  }, []);

  const setSfxVolume = useCallback((volume: number) => {
    getSoundController().setSfxVolume(volume);
  }, []);

  const setMusicMuted = useCallback((muted: boolean) => {
    getSoundController().setMusicMuted(muted);
  }, []);

  const setMusicVolume = useCallback((volume: number) => {
    getSoundController().setMusicVolume(volume);
  }, []);

  return {
    play,
    startLoop,
    stopLoop,
    startThemeSong,
    stopThemeSong,
    setSfxMuted,
    setSfxVolume,
    setMusicMuted,
    setMusicVolume,
    isSfxMuted: settings.sfxMuted,
    sfxVolume: settings.sfxVolume,
    isMusicMuted: settings.musicMuted,
    musicVolume: settings.musicVolume,
  };
}
