import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetSoundController } from '@/lib/sound/sound-platform';

// Mock the platform sound controller so hooks stay decoupled from the web implementation.
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

vi.mock('@/lib/sound/sound-platform', () => ({
  getSoundController: vi.fn(() => ({
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
  resetSoundController: vi.fn(),
}));

import { useSound } from './useSound';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  resetSoundController();
});

describe('useSound', () => {
  it('calls preloadAll on mount', () => {
    renderHook(() => useSound());
    expect(mockPreloadAll).toHaveBeenCalledTimes(1);
    expect(mockPreloadAll).toHaveBeenCalledWith(['/sounds/themes/finch.mp3']);
  });

  it('preloads the currently selected theme song instead of all theme songs', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 12,
        birdsIdentified: 10,
        currentStreak: 0,
        justAchievedStreak: false,
        bestStreak: 0,
        seeds: 0,
      })
    );
    localStorage.setItem(
      'birdTheme',
      JSON.stringify({
        name: 'Raven',
        primary: '#0a0a14',
        secondary: '#1B1B5C',
        textColor: '#FFFFFF',
        realFakeTextColor: '#B6B6FF',
        themeSong: '/sounds/themes/raven.mp3',
      })
    );

    renderHook(() => useSound());

    expect(mockPreloadAll).toHaveBeenCalledWith(['/sounds/themes/raven.mp3']);
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
