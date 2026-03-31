import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundManager } from '@/lib/sound/sound-manager';

// Mock SoundManager so we can spy on it without real AudioContext
const mockPlay = vi.fn();
const mockStartLoop = vi.fn();
const mockStopLoop = vi.fn();
const mockSetMuted = vi.fn();
const mockSetVolume = vi.fn();
const mockPreloadAll = vi.fn().mockResolvedValue(undefined);
const mockGetSettings = vi.fn().mockReturnValue({ muted: false, volume: 0.7 });

vi.mock('@/lib/sound/sound-manager', () => ({
  SoundManager: {
    getInstance: vi.fn(() => ({
      play: mockPlay,
      startLoop: mockStartLoop,
      stopLoop: mockStopLoop,
      setMuted: mockSetMuted,
      setVolume: mockSetVolume,
      preloadAll: mockPreloadAll,
      getSettings: mockGetSettings,
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
  });

  it('returns default settings when localStorage is empty', () => {
    const { result } = renderHook(() => useSound());
    expect(result.current.isMuted).toBe(false);
    expect(result.current.volume).toBe(0.7);
  });

  it('returns stored settings from localStorage', () => {
    localStorage.setItem(
      'birdSoundSettings',
      JSON.stringify({ muted: true, volume: 0.3 })
    );
    const { result } = renderHook(() => useSound());
    expect(result.current.isMuted).toBe(true);
    expect(result.current.volume).toBe(0.3);
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

  it('setMuted() delegates to SoundManager.setMuted()', () => {
    const { result } = renderHook(() => useSound());
    act(() => {
      result.current.setMuted(true);
    });
    expect(mockSetMuted).toHaveBeenCalledWith(true);
  });

  it('setVolume() delegates to SoundManager.setVolume()', () => {
    const { result } = renderHook(() => useSound());
    act(() => {
      result.current.setVolume(0.5);
    });
    expect(mockSetVolume).toHaveBeenCalledWith(0.5);
  });

  it('syncs muted setting into SoundManager when it differs', () => {
    // Stored says muted=true, but SoundManager says muted=false
    localStorage.setItem(
      'birdSoundSettings',
      JSON.stringify({ muted: true, volume: 0.7 })
    );
    mockGetSettings.mockReturnValue({ muted: false, volume: 0.7 });

    renderHook(() => useSound());
    expect(mockSetMuted).toHaveBeenCalledWith(true);
  });

  it('syncs volume setting into SoundManager when it differs', () => {
    localStorage.setItem(
      'birdSoundSettings',
      JSON.stringify({ muted: false, volume: 0.3 })
    );
    mockGetSettings.mockReturnValue({ muted: false, volume: 0.7 });

    renderHook(() => useSound());
    expect(mockSetVolume).toHaveBeenCalledWith(0.3);
  });
});
