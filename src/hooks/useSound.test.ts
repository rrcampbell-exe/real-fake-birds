import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock SoundManager so we can spy on it without real AudioContext
const mockPlay = vi.fn();
const mockStartLoop = vi.fn();
const mockStopLoop = vi.fn();
const mockStartThemeSong = vi.fn();
const mockStopThemeSong = vi.fn();
const mockSetSfxMuted = vi.fn();
const mockSetSfxVolume = vi.fn();
const mockSetMusicMuted = vi.fn();
const mockSetMusicVolume = vi.fn();
const mockPreloadAll = vi.fn().mockResolvedValue(undefined);
const mockGetSettings = vi.fn().mockReturnValue({
  sfxMuted: false,
  sfxVolume: 0.7,
  musicMuted: false,
  musicVolume: 1,
});
const mockUnlock = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/sound/sound-manager', () => ({
  SoundManager: {
    getInstance: vi.fn(() => ({
      play: mockPlay,
      startLoop: mockStartLoop,
      stopLoop: mockStopLoop,
      startThemeSong: mockStartThemeSong,
      stopThemeSong: mockStopThemeSong,
      setSfxMuted: mockSetSfxMuted,
      setSfxVolume: mockSetSfxVolume,
      setMusicMuted: mockSetMusicMuted,
      setMusicVolume: mockSetMusicVolume,
      preloadAll: mockPreloadAll,
      getSettings: mockGetSettings,
      unlock: mockUnlock,
    })),
  },
}));

import { useSound } from './useSound';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useSound', () => {
  it('calls preloadAll on mount', () => {
    renderHook(() => useSound());
    expect(mockPreloadAll).toHaveBeenCalledTimes(1);
    expect(mockPreloadAll).toHaveBeenCalledWith(['/sounds/themes/finch.mp3', '/sounds/themes/raven.mp3', '/sounds/themes/robin.mp3', '/sounds/themes/seagull.mp3', '/sounds/themes/crane.mp3', '/sounds/themes/woodpecker.mp3', '/sounds/themes/blue-jay.mp3', '/sounds/themes/oriole.mp3', '/sounds/themes/heron.mp3', '/sounds/themes/cardinal.mp3']);
  });

  it('returns default settings when localStorage is empty', () => {
    const { result } = renderHook(() => useSound());
    expect(result.current.isSfxMuted).toBe(false);
    expect(result.current.sfxVolume).toBe(0.7);
    expect(result.current.isMusicMuted).toBe(false);
    expect(result.current.musicVolume).toBe(1);
  });

  it('returns stored settings from localStorage', () => {
    localStorage.setItem(
      'birdSoundSettings',
      JSON.stringify({ sfxMuted: true, sfxVolume: 0.3, musicMuted: false, musicVolume: 0.85 })
    );
    const { result } = renderHook(() => useSound());
    expect(result.current.isSfxMuted).toBe(true);
    expect(result.current.sfxVolume).toBe(0.3);
    expect(result.current.isMusicMuted).toBe(false);
    expect(result.current.musicVolume).toBe(0.85);
  });

  it('play() delegates to SoundManager.play()', () => {
    const { result } = renderHook(() => useSound());
    act(() => {
      result.current.play('tap');
    });
    expect(mockPlay).toHaveBeenCalledWith('tap');
  });

  it('startLoop() delegates to SoundManager.startLoop()', () => {
    const { result } = renderHook(() => useSound());
    act(() => {
      result.current.startLoop('loadingLoop');
    });
    expect(mockStartLoop).toHaveBeenCalledWith('loadingLoop');
  });

  it('stopLoop() delegates to SoundManager.stopLoop()', () => {
    const { result } = renderHook(() => useSound());
    act(() => {
      result.current.stopLoop('loadingLoop');
    });
    expect(mockStopLoop).toHaveBeenCalledWith('loadingLoop');
  });

  it('startThemeSong() delegates to SoundManager.startThemeSong()', () => {
    const { result } = renderHook(() => useSound());
    act(() => {
      result.current.startThemeSong('/sounds/themes/finch.mp3');
    });
    expect(mockStartThemeSong).toHaveBeenCalledWith('/sounds/themes/finch.mp3');
  });

  it('stopThemeSong() delegates to SoundManager.stopThemeSong()', () => {
    const { result } = renderHook(() => useSound());
    act(() => {
      result.current.stopThemeSong();
    });
    expect(mockStopThemeSong).toHaveBeenCalled();
  });

  it('setSfxMuted() delegates to SoundManager.setSfxMuted()', () => {
    const { result } = renderHook(() => useSound());
    act(() => {
      result.current.setSfxMuted(true);
    });
    expect(mockSetSfxMuted).toHaveBeenCalledWith(true);
  });

  it('setSfxVolume() delegates to SoundManager.setSfxVolume()', () => {
    const { result } = renderHook(() => useSound());
    act(() => {
      result.current.setSfxVolume(0.5);
    });
    expect(mockSetSfxVolume).toHaveBeenCalledWith(0.5);
  });

  it('setMusicMuted() delegates to SoundManager.setMusicMuted()', () => {
    const { result } = renderHook(() => useSound());
    act(() => {
      result.current.setMusicMuted(true);
    });
    expect(mockSetMusicMuted).toHaveBeenCalledWith(true);
  });

  it('setMusicVolume() delegates to SoundManager.setMusicVolume()', () => {
    const { result } = renderHook(() => useSound());
    act(() => {
      result.current.setMusicVolume(0.85);
    });
    expect(mockSetMusicVolume).toHaveBeenCalledWith(0.85);
  });

  it('syncs sfx muted setting into SoundManager when it differs', () => {
    localStorage.setItem(
      'birdSoundSettings',
      JSON.stringify({ sfxMuted: true, sfxVolume: 0.7, musicMuted: false, musicVolume: 1 })
    );
    mockGetSettings.mockReturnValue({ sfxMuted: false, sfxVolume: 0.7, musicMuted: false, musicVolume: 1 });

    renderHook(() => useSound());
    expect(mockSetSfxMuted).toHaveBeenCalledWith(true);
  });

  it('syncs music volume setting into SoundManager when it differs', () => {
    localStorage.setItem(
      'birdSoundSettings',
      JSON.stringify({ sfxMuted: false, sfxVolume: 0.7, musicMuted: false, musicVolume: 0.8 })
    );
    mockGetSettings.mockReturnValue({ sfxMuted: false, sfxVolume: 0.7, musicMuted: false, musicVolume: 1 });

    renderHook(() => useSound());
    expect(mockSetMusicVolume).toHaveBeenCalledWith(0.8);
  });

  it('unlocks audio on the first user gesture', () => {
    renderHook(() => useSound());

    act(() => {
      window.dispatchEvent(new PointerEvent('pointerdown'));
    });

    expect(mockUnlock).toHaveBeenCalledTimes(1);
  });
});
