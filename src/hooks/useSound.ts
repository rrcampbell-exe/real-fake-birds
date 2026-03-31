'use client';

import { useCallback, useEffect } from 'react';
import { SoundManager } from '@/lib/sound/sound-manager';
import type { SoundKey } from '@/lib/sound/sound-manager';
import type { SoundSettings } from '@/types';
import { useStoredJson } from '@/hooks/useStoredValue';

const DEFAULT_SETTINGS: SoundSettings = { muted: false, volume: 0.7 };

export function useSound() {
  const settings = useStoredJson<SoundSettings>('birdSoundSettings', DEFAULT_SETTINGS);

  // Sync reactive stored settings into the SoundManager singleton
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mgr = SoundManager.getInstance();
    const current = mgr.getSettings();
    if (current.muted !== settings.muted) mgr.setMuted(settings.muted);
    if (current.volume !== settings.volume) mgr.setVolume(settings.volume);
  }, [settings.muted, settings.volume]);

  // Preload file-based sounds once on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    SoundManager.getInstance().preloadAll();
  }, []);

  // Resume AudioContext on first user gesture (iOS / Android requirement)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const resume = () => SoundManager.getInstance().play('tap' as SoundKey);

    // We don't actually want to play a tap on resume — just ensure context is alive.
    // Instead, access the instance which calls ensureContext -> resume internally.
    const touch = () => {
      void SoundManager.getInstance();
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

  const setMuted = useCallback((muted: boolean) => {
    SoundManager.getInstance().setMuted(muted);
  }, []);

  const setVolume = useCallback((volume: number) => {
    SoundManager.getInstance().setVolume(volume);
  }, []);

  return {
    play,
    startLoop,
    stopLoop,
    setMuted,
    setVolume,
    isMuted: settings.muted,
    volume: settings.volume,
  };
}
