import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundManager } from './sound-manager';

async function flushAsyncAudioWork() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

// ---- Mock AudioContext ----

function createMockOscillator() {
  return {
    type: 'sine' as OscillatorType,
    frequency: {
      value: 440,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn().mockReturnThis(),
    start: vi.fn(),
    stop: vi.fn(),
  };
}

function createMockGain() {
  return {
    gain: {
      value: 1,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn().mockReturnThis(),
  };
}

function createMockBufferSource() {
  return {
    buffer: null as AudioBuffer | null,
    connect: vi.fn().mockReturnThis(),
    start: vi.fn(),
    stop: vi.fn(),
  };
}

function createMockAudioContext() {
  const ctx = {
    state: 'running' as AudioContextState,
    currentTime: 0,
    sampleRate: 44100,
    destination: {} as AudioDestinationNode,
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    createOscillator: vi.fn(() => createMockOscillator()),
    createGain: vi.fn(() => createMockGain()),
    createBufferSource: vi.fn(() => createMockBufferSource()),
    createBiquadFilter: vi.fn(() => ({
      type: 'bandpass' as BiquadFilterType,
      frequency: {
        value: 0,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      Q: { value: 0 },
      connect: vi.fn().mockReturnThis(),
    })),
    createBuffer: vi.fn((_channels: number, length: number, sampleRate: number) => ({
      length,
      sampleRate,
      getChannelData: vi.fn(() => new Float32Array(length)),
    })),
    decodeAudioData: vi.fn().mockResolvedValue({
      length: 44100,
      sampleRate: 44100,
    } as unknown as AudioBuffer),
  };
  return ctx;
}

let mockCtx: ReturnType<typeof createMockAudioContext>;

beforeEach(() => {
  mockCtx = createMockAudioContext();
  vi.stubGlobal('AudioContext', function (this: ReturnType<typeof createMockAudioContext>) {
    Object.assign(this, mockCtx);
  });
});

afterEach(() => {
  SoundManager.resetInstance();
});

describe('SoundManager', () => {
  describe('singleton', () => {
    it('returns the same instance on repeated calls', () => {
      const a = SoundManager.getInstance();
      const b = SoundManager.getInstance();
      expect(a).toBe(b);
    });

    it('returns a fresh instance after reset', () => {
      const a = SoundManager.getInstance();
      SoundManager.resetInstance();
      const b = SoundManager.getInstance();
      expect(a).not.toBe(b);
    });
  });

  describe('settings persistence', () => {
    it('loads default settings when localStorage is empty', () => {
      const mgr = SoundManager.getInstance();
      const settings = mgr.getSettings();
      expect(settings).toEqual({
        sfxMuted: false,
        sfxVolume: 0.7,
        musicMuted: false,
        musicVolume: 1,
      });
    });

    it('loads saved settings from localStorage', () => {
      localStorage.setItem(
        'birdSoundSettings',
        JSON.stringify({ sfxMuted: true, sfxVolume: 0.4, musicMuted: false, musicVolume: 0.8 })
      );
      const mgr = SoundManager.getInstance();
      expect(mgr.getSettings()).toEqual({ sfxMuted: true, sfxVolume: 0.4, musicMuted: false, musicVolume: 0.8 });
    });

    it('migrates the old single-volume settings shape', () => {
      localStorage.setItem(
        'birdSoundSettings',
        JSON.stringify({ muted: true, volume: 0.4 })
      );
      const mgr = SoundManager.getInstance();
      expect(mgr.getSettings()).toEqual({
        sfxMuted: true,
        sfxVolume: 0.4,
        musicMuted: true,
        musicVolume: 1,
      });
    });

    it('saves settings on setSfxMuted', () => {
      const mgr = SoundManager.getInstance();
      mgr.setSfxMuted(true);
      const stored = JSON.parse(localStorage.getItem('birdSoundSettings')!);
      expect(stored.sfxMuted).toBe(true);
    });

    it('saves settings on setMusicVolume', () => {
      const mgr = SoundManager.getInstance();
      mgr.setMusicVolume(0.85);
      const stored = JSON.parse(localStorage.getItem('birdSoundSettings')!);
      expect(stored.musicVolume).toBe(0.85);
    });

    it('clamps sfx and music volume between 0 and 1', () => {
      const mgr = SoundManager.getInstance();
      mgr.setSfxVolume(1.5);
      expect(mgr.getSettings().sfxVolume).toBe(1);
      mgr.setMusicVolume(-0.3);
      expect(mgr.getSettings().musicVolume).toBe(0);
    });
  });

  describe('play', () => {
    it('does not play when muted', () => {
      const mgr = SoundManager.getInstance();
      mgr.setSfxMuted(true);
      mgr.play('tap');
      // AudioContext is created lazily — if muted, createOscillator should not be called
      // (ensureContext is called by setMuted which sets up the context, but play bails early)
      expect(mockCtx.createOscillator).not.toHaveBeenCalled();
    });

    it('plays a synth sound by creating an oscillator', () => {
      const mgr = SoundManager.getInstance();
      mgr.play('tap');
      expect(mockCtx.createOscillator).toHaveBeenCalled();
    });

    it('plays a different synth sound (navTap)', () => {
      const mgr = SoundManager.getInstance();
      mgr.play('navTap');
      expect(mockCtx.createOscillator).toHaveBeenCalled();
    });

    it('plays whoosh (white noise) synth sound', () => {
      const mgr = SoundManager.getInstance();
      mgr.play('whoosh');
      expect(mockCtx.createBuffer).toHaveBeenCalled();
      expect(mockCtx.createBiquadFilter).toHaveBeenCalled();
    });

    it('plays themeChange (two-tone chime)', () => {
      const mgr = SoundManager.getInstance();
      mgr.play('themeChange');
      // Two notes → two oscillators
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2);
    });

    it('resumes a suspended AudioContext before playing', () => {
      mockCtx.state = 'suspended' as AudioContextState;
      const mgr = SoundManager.getInstance();
      mgr.play('tap');
      expect(mockCtx.resume).toHaveBeenCalled();
    });

    it('plays streak at a reduced per-sound gain', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        })
      );

      const mgr = SoundManager.getInstance();
      mgr.play('streak');

      await flushAsyncAudioWork();

      const fileGainNode = mockCtx.createGain.mock.results.at(-1)?.value;
      expect(fileGainNode.gain.setValueAtTime).toHaveBeenCalledWith(0.45, 0);
    });
  });

  describe('preloadAll', () => {
    it('fetches and decodes file-based sounds', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        })
      );

      const mgr = SoundManager.getInstance();
      await mgr.preloadAll();

      // Should have fetched all file-backed sounds, including the loading loop
      expect(fetch).toHaveBeenCalledWith('/sounds/fx/correct.mp3');
      expect(fetch).toHaveBeenCalledWith('/sounds/fx/wrong.mp3');
      expect(fetch).toHaveBeenCalledWith('/sounds/fx/streak.mp3');
      expect(fetch).toHaveBeenCalledWith('/sounds/fx/milestone.mp3');
      expect(fetch).toHaveBeenCalledWith('/sounds/fx/error.mp3');
      expect(fetch).toHaveBeenCalledWith('/sounds/fx/loading.mp3');
    });

    it('preloads additional URLs such as theme songs', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        })
      );

      const mgr = SoundManager.getInstance();
      await mgr.preloadAll(['/sounds/themes/bird-bossa-nova.mp3']);

      expect(fetch).toHaveBeenCalledWith('/sounds/themes/bird-bossa-nova.mp3');
    });

    it('silently skips files that fail to fetch', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Not found')));

      const mgr = SoundManager.getInstance();
      // Should not throw
      await expect(mgr.preloadAll()).resolves.toBeUndefined();
    });
  });

  describe('loops', () => {
    it('starts and stops a loading loop from the loading.mp3 file', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        })
      );

      const mgr = SoundManager.getInstance();
      mgr.startLoop('loadingLoop');

      expect(fetch).toHaveBeenCalledWith('/sounds/fx/loading.mp3');
      await flushAsyncAudioWork();
      expect(mockCtx.createBufferSource).toHaveBeenCalled();

      // stopping should not throw
      mgr.stopLoop('loadingLoop');
    });

    it('does not start a duplicate loop', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        })
      );

      const mgr = SoundManager.getInstance();
      mgr.startLoop('loadingLoop');

      await flushAsyncAudioWork();
      expect(mockCtx.createBufferSource).toHaveBeenCalledTimes(1);

      const count = mockCtx.createBufferSource.mock.calls.length;
      mgr.startLoop('loadingLoop');

      await flushAsyncAudioWork();
      expect(mockCtx.createBufferSource.mock.calls.length).toBe(count);
      mgr.stopLoop('loadingLoop');
    });

    it('does not start a loop when muted', () => {
      const mgr = SoundManager.getInstance();
      mgr.setSfxMuted(true);
      mgr.startLoop('loadingLoop');
      // createOscillator was called during setMuted (ensureContext) but not for the loop
      // The key thing: no active loop should exist
      mgr.stopLoop('loadingLoop'); // should be a no-op, no error
    });

    it('starts a dedicated theme-song loop from the provided URL', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        })
      );

      const mgr = SoundManager.getInstance();
      mgr.startThemeSong('/sounds/themes/finch.mp3');

      expect(fetch).toHaveBeenCalledWith('/sounds/themes/finch.mp3');
      await flushAsyncAudioWork();
      expect(mockCtx.createBufferSource).toHaveBeenCalled();

      mgr.stopThemeSong();
    });

    it('reuses a preloaded theme-song buffer without refetching on start', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      });
      vi.stubGlobal('fetch', fetchSpy);

      const mgr = SoundManager.getInstance();
      await mgr.preloadAll(['/sounds/themes/finch.mp3']);

      fetchSpy.mockClear();

      mgr.startThemeSong('/sounds/themes/finch.mp3');
      await flushAsyncAudioWork();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(mockCtx.createBufferSource).toHaveBeenCalled();
    });
  });

  describe('graceful fallback', () => {
    it('handles AudioContext constructor throwing', () => {
      vi.stubGlobal('AudioContext', vi.fn(() => { throw new Error('Not supported'); }));
      const mgr = SoundManager.getInstance();
      // play should not throw
      mgr.play('tap');
    });

    it('handles missing AudioContext (SSR)', () => {
      vi.stubGlobal('AudioContext', undefined);
      const mgr = SoundManager.getInstance();
      mgr.play('tap');
      // Should silently fail
    });
  });
});
