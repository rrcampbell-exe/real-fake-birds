import { afterEach, describe, expect, it, vi } from 'vitest';
import { SoundManager } from '@/lib/sound/sound-manager';
import { getSoundController, resetSoundController, setSoundController } from '@/lib/sound/sound-platform';
import type { SoundController } from '@/lib/sound/types';

afterEach(() => {
  resetSoundController();
  vi.restoreAllMocks();
});

describe('sound-platform', () => {
  it('returns the web sound manager by default', () => {
    const getInstanceSpy = vi.spyOn(SoundManager, 'getInstance');

    const controller = getSoundController();

    expect(controller).toBeInstanceOf(SoundManager);
    expect(getInstanceSpy).toHaveBeenCalledTimes(1);
  });

  it('reuses the same controller across repeated calls', () => {
    const first = getSoundController();
    const second = getSoundController();

    expect(first).toBe(second);
  });

  it('allows overriding the controller for future platform adapters', () => {
    const controller: SoundController = {
      unlock: vi.fn().mockResolvedValue(undefined),
      preloadAll: vi.fn().mockResolvedValue(undefined),
      play: vi.fn(),
      startLoop: vi.fn(),
      stopLoop: vi.fn(),
      startThemeSong: vi.fn(),
      stopThemeSong: vi.fn(),
      getSettings: vi.fn().mockReturnValue({ sfxMuted: false, sfxVolume: 0.7, musicMuted: false, musicVolume: 1 }),
      setSfxMuted: vi.fn(),
      setSfxVolume: vi.fn(),
      setMusicMuted: vi.fn(),
      setMusicVolume: vi.fn(),
    };

    setSoundController(controller);

    expect(getSoundController()).toBe(controller);
  });

  it('resets the controller back to the default web implementation', () => {
    const resetInstanceSpy = vi.spyOn(SoundManager, 'resetInstance');

    setSoundController({
      unlock: vi.fn().mockResolvedValue(undefined),
      preloadAll: vi.fn().mockResolvedValue(undefined),
      play: vi.fn(),
      startLoop: vi.fn(),
      stopLoop: vi.fn(),
      startThemeSong: vi.fn(),
      stopThemeSong: vi.fn(),
      getSettings: vi.fn().mockReturnValue({ sfxMuted: false, sfxVolume: 0.7, musicMuted: false, musicVolume: 1 }),
      setSfxMuted: vi.fn(),
      setSfxVolume: vi.fn(),
      setMusicMuted: vi.fn(),
      setMusicVolume: vi.fn(),
    });

    resetSoundController();

    expect(resetInstanceSpy).toHaveBeenCalledTimes(1);
    expect(getSoundController()).toBeInstanceOf(SoundManager);
  });
});