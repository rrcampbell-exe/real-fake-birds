'use client';

import { useCallback, useEffect } from 'react';
import { SoundManager } from '@/lib/sound/sound-manager';
import type { SoundKey } from '@/lib/sound/sound-manager';
import { themes } from '@/lib/themes';
import type { SoundSettings } from '@/types';
import { useStoredJson } from '@/hooks/useStoredValue';

const DEFAULT_SETTINGS: SoundSettings = {
  sfxMuted: false,
  sfxVolume: 0.7,
  musicMuted: false,
  musicVolume: 1,
};

const THEME_SONG_URLS = [...new Set(themes.flatMap((theme) => theme.themeSong ? [theme.themeSong] : []))];

export function useSound() {
  const settings = useStoredJson<SoundSettings>('birdSoundSettings', DEFAULT_SETTINGS);

  // Sync reactive stored settings into the SoundManager singleton
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mgr = SoundManager.getInstance();
    const current = mgr.getSettings();
    if (current.sfxMuted !== settings.sfxMuted) mgr.setSfxMuted(settings.sfxMuted);
    if (current.sfxVolume !== settings.sfxVolume) mgr.setSfxVolume(settings.sfxVolume);
    if (current.musicMuted !== settings.musicMuted) mgr.setMusicMuted(settings.musicMuted);
    if (current.musicVolume !== settings.musicVolume) mgr.setMusicVolume(settings.musicVolume);
  }, [settings.musicMuted, settings.musicVolume, settings.sfxMuted, settings.sfxVolume]);

  // Preload file-based sounds once on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    SoundManager.getInstance().preloadAll(THEME_SONG_URLS);
  }, []);

  // Resume AudioContext on first user gesture (iOS / Android requirement)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const touch = () => {
      SoundManager.getInstance().resume();
      window.removeEventListener('touchstart', touch);
      window.removeEventListener('click', touch);
    };

    window.addEventListener('touchstart', touch, { once: true });
    window.addEventListener('click', touch, { once: true });

    return () => {
      window.removeEventListener('touchstart', touch);
      window.removeEventListener('click', touch);
    };
  }, []);

  const play = useCallback((key: SoundKey) => {
    SoundManager.getInstance().play(key);
  }, []);

  const startLoop = useCallback((key: SoundKey) => {
    SoundManager.getInstance().startLoop(key);
  }, []);

  const stopLoop = useCallback((key: SoundKey) => {
    SoundManager.getInstance().stopLoop(key);
  }, []);

  const startThemeSong = useCallback((url: string) => {
    SoundManager.getInstance().startThemeSong(url);
  }, []);

  const stopThemeSong = useCallback(() => {
    SoundManager.getInstance().stopThemeSong();
  }, []);

  const setSfxMuted = useCallback((muted: boolean) => {
    SoundManager.getInstance().setSfxMuted(muted);
  }, []);

  const setSfxVolume = useCallback((volume: number) => {
    SoundManager.getInstance().setSfxVolume(volume);
  }, []);

  const setMusicMuted = useCallback((muted: boolean) => {
    SoundManager.getInstance().setMusicMuted(muted);
  }, []);

  const setMusicVolume = useCallback((volume: number) => {
    SoundManager.getInstance().setMusicVolume(volume);
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
