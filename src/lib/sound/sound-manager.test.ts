import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundManager } from './sound-manager';

async function flushAsyncAudioWork() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, resolve, reject };
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
    loop: false,
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
    onstatechange: null as (() => void) | null,
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
let visibilityState: DocumentVisibilityState;

beforeEach(() => {
  localStorage.clear();
  visibilityState = 'visible';
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => visibilityState,
  });

  mockCtx = createMockAudioContext();
  vi.stubGlobal('AudioContext', function (this: ReturnType<typeof createMockAudioContext>) {
    Object.assign(this, mockCtx);
  });
});

afterEach(() => {
  SoundManager.resetInstance();
  vi.unstubAllGlobals();
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
    it('queues file-based sounds until audio is unlocked', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        })
      );

      const mgr = SoundManager.getInstance();
      await mgr.preloadAll();

      expect(fetch).not.toHaveBeenCalled();

      await mgr.unlock();

      // Should have fetched all file-backed sounds, including the loading loop
      expect(fetch).toHaveBeenCalledWith('/sounds/fx/correct.mp3');
      expect(fetch).toHaveBeenCalledWith('/sounds/fx/wrong.mp3');
      expect(fetch).toHaveBeenCalledWith('/sounds/fx/streak.mp3');
      expect(fetch).toHaveBeenCalledWith('/sounds/fx/milestone.mp3');
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

      expect(fetch).not.toHaveBeenCalled();

      await mgr.unlock();

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
    it('starts and stops a loading loop from the loading.mp3 file after unlock', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        })
      );

      const mgr = SoundManager.getInstance();
      mgr.startLoop('loadingLoop');

      expect(fetch).not.toHaveBeenCalled();

      await mgr.unlock();

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

      await mgr.unlock();

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

    it('starts a dedicated theme-song loop from the provided URL after unlock', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        })
      );

      const mgr = SoundManager.getInstance();
      mgr.startThemeSong('/sounds/themes/finch.mp3');

      expect(fetch).not.toHaveBeenCalled();

      await mgr.unlock();

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
      await mgr.unlock();

      fetchSpy.mockClear();

      mgr.startThemeSong('/sounds/themes/finch.mp3');
      await flushAsyncAudioWork();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(mockCtx.createBufferSource).toHaveBeenCalled();
    });

    it('prevents duplicate theme-song starts while the first load is still in flight', async () => {
      const deferredDecode = createDeferred<AudioBuffer>();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        })
      );
      mockCtx.decodeAudioData.mockReturnValueOnce(deferredDecode.promise);

      const mgr = SoundManager.getInstance();
      mgr.play('tap');
      mgr.startThemeSong('/sounds/themes/crane.mp3');
      mgr.startThemeSong('/sounds/themes/crane.mp3');

      deferredDecode.resolve({
        length: 44100,
        sampleRate: 44100,
      } as AudioBuffer);
      await flushAsyncAudioWork();

      expect(mockCtx.createBufferSource).toHaveBeenCalledTimes(1);
    });

    it('stops active audio when hidden and restores the desired theme when visible again', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        })
      );

      const mgr = SoundManager.getInstance();
      mgr.startThemeSong('/sounds/themes/crane.mp3');
      await mgr.unlock();
      await flushAsyncAudioWork();

      const firstThemeSource = mockCtx.createBufferSource.mock.results[0]?.value;
      expect(firstThemeSource?.start).toHaveBeenCalledTimes(1);

      visibilityState = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));

      expect(firstThemeSource?.stop).toHaveBeenCalledTimes(1);

      visibilityState = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
      await flushAsyncAudioWork();

      expect(mockCtx.createBufferSource).toHaveBeenCalledTimes(2);
    });

    it('resets the audio context on persisted pageshow restores', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        })
      );

      const mgr = SoundManager.getInstance();
      mgr.startThemeSong('/sounds/themes/crane.mp3');
      await mgr.unlock();
      await flushAsyncAudioWork();

      const pageShowEvent = new Event('pageshow');
      Object.defineProperty(pageShowEvent, 'persisted', {
        configurable: true,
        value: true,
      });

      window.dispatchEvent(pageShowEvent);
      await flushAsyncAudioWork();

      expect(mockCtx.close).toHaveBeenCalledTimes(1);
      expect(mockCtx.createBufferSource).toHaveBeenCalledTimes(2);
    });
  });

  describe('additional lifecycle and branching coverage', () => {
    it('falls back to defaults when stored settings JSON is invalid', () => {
      localStorage.setItem('birdSoundSettings', '{not-json');

      const mgr = SoundManager.getInstance();

      expect(mgr.getSettings()).toEqual({
        sfxMuted: false,
        sfxVolume: 0.7,
        musicMuted: false,
        musicVolume: 1,
      });
    });

    it('falls back to defaults when stored settings shape is unsupported', () => {
      localStorage.setItem('birdSoundSettings', JSON.stringify({ enabled: true }));

      const mgr = SoundManager.getInstance();

      expect(mgr.getSettings()).toEqual({
        sfxMuted: false,
        sfxVolume: 0.7,
        musicMuted: false,
        musicVolume: 1,
      });
    });

    it('plays cached file-backed sounds without refetching', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      });
      vi.stubGlobal('fetch', fetchSpy);

      const mgr = SoundManager.getInstance();
      await mgr.preloadAll(['/sounds/fx/correct.mp3']);
      await mgr.unlock();
      await flushAsyncAudioWork();

      fetchSpy.mockClear();
      mockCtx.createBufferSource.mockClear();

      mgr.play('correct');
      await flushAsyncAudioWork();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(mockCtx.createBufferSource).toHaveBeenCalledTimes(1);
    });

    it('starts synth-backed loops when the context is already ready', () => {
      const mgr = SoundManager.getInstance();
      mgr.play('tap');
      mockCtx.createOscillator.mockClear();

      mgr.startLoop('tap');

      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(1);
    });

    it('ignores unknown sound keys', () => {
      const mgr = SoundManager.getInstance();

      expect(() => mgr.play('unknown-sound' as never)).not.toThrow();
      expect(mockCtx.createOscillator).not.toHaveBeenCalled();
      expect(mockCtx.createBufferSource).not.toHaveBeenCalled();
    });

    it('does not start theme songs while music is muted', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      });
      vi.stubGlobal('fetch', fetchSpy);

      const mgr = SoundManager.getInstance();
      mgr.setMusicMuted(true);
      mgr.startThemeSong('/sounds/themes/crane.mp3');
      await flushAsyncAudioWork();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(mockCtx.createBufferSource).not.toHaveBeenCalled();
    });

    it('restarts the desired theme song when music is unmuted', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        })
      );

      const mgr = SoundManager.getInstance();
      mgr.setMusicMuted(true);
      mgr.startThemeSong('/sounds/themes/crane.mp3');

      expect(fetch).not.toHaveBeenCalled();

      mgr.setMusicMuted(false);
      await mgr.unlock();
      await flushAsyncAudioWork();

      expect(fetch).toHaveBeenCalledWith('/sounds/themes/crane.mp3');
      expect(mockCtx.createBufferSource).toHaveBeenCalled();
    });

    it('restores the desired theme on non-persisted pageshow without resetting the context', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        })
      );

      const mgr = SoundManager.getInstance();
      mgr.startThemeSong('/sounds/themes/crane.mp3');
      await mgr.unlock();
      await flushAsyncAudioWork();

      const firstThemeSource = mockCtx.createBufferSource.mock.results[0]?.value;
      visibilityState = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
      expect(firstThemeSource?.stop).toHaveBeenCalledTimes(1);

      window.dispatchEvent(new Event('pageshow'));
      await flushAsyncAudioWork();

      expect(mockCtx.close).not.toHaveBeenCalled();
      expect(mockCtx.createBufferSource).toHaveBeenCalledTimes(2);
    });

    it('stops active playback when the audio context reports an interruption', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        })
      );

      const mgr = SoundManager.getInstance();
      mgr.startThemeSong('/sounds/themes/crane.mp3');
      await mgr.unlock();
      await flushAsyncAudioWork();

      const themeSource = mockCtx.createBufferSource.mock.results[0]?.value;
      const activeCtx = (mgr as unknown as { ctx: AudioContext | null }).ctx;
      if (!activeCtx) {
        throw new Error('expected audio context');
      }

      Object.assign(activeCtx, { state: 'interrupted' as AudioContextState });
      activeCtx.onstatechange?.();

      expect(themeSource?.stop).toHaveBeenCalledTimes(1);
    });
  });

  describe('gesture unlock registration', () => {
    it('registers the gesture unlock listener only once', () => {
      const mgr = SoundManager.getInstance();
      const unlockSpy = vi.spyOn(mgr, 'unlock').mockResolvedValue(undefined);

      mgr.registerGestureUnlock();
      mgr.registerGestureUnlock();

      window.dispatchEvent(new PointerEvent('pointerdown'));

      expect(unlockSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('graceful fallback', () => {
    it('handles AudioContext constructor throwing', () => {
      vi.stubGlobal('AudioContext', function BrokenAudioContext() {
        throw new Error('Not supported');
      });
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
