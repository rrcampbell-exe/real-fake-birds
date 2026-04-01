import { notifyStoredValueChanged } from '@/hooks/useStoredValue';
import type { SoundSettings } from '@/types';

const SETTINGS_KEY = 'birdSoundSettings';
const DEFAULT_SETTINGS: SoundSettings = {
  sfxMuted: false,
  sfxVolume: 0.7,
  musicMuted: false,
  musicVolume: 1,
};

type SoundKey =
  | 'tap'
  | 'correct'
  | 'wrong'
  | 'streak'
  | 'milestone'
  | 'whoosh'
  | 'navTap'
  | 'themeChange'
  | 'error'
  | 'loadingLoop';

interface SoundDef {
  type: 'file' | 'synth';
  url?: string;
  synthFn?: (ctx: AudioContext, dest: AudioNode) => void;
  gain?: number;
}

const SOUND_DEFS: Record<SoundKey, SoundDef> = {
  tap: { type: 'synth', synthFn: synthTap },
  correct: { type: 'file', url: '/sounds/fx/correct.mp3' },
  wrong: { type: 'file', url: '/sounds/fx/wrong.mp3' },
  streak: { type: 'file', url: '/sounds/fx/streak.mp3', gain: 0.45 },
  milestone: { type: 'file', url: '/sounds/fx/milestone.mp3' },
  whoosh: { type: 'synth', synthFn: synthWhoosh },
  navTap: { type: 'synth', synthFn: synthNavTap },
  themeChange: { type: 'synth', synthFn: synthThemeChange },
  error: { type: 'file', url: '/sounds/fx/error.mp3' },
  loadingLoop: { type: 'file', url: '/sounds/fx/loading.mp3' },
};

// --- Synth functions ---

function synthTap(ctx: AudioContext, dest: AudioNode) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.005);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
  osc.connect(gain).connect(dest);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.04);
}

function synthNavTap(ctx: AudioContext, dest: AudioNode) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.003);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
  osc.connect(gain).connect(dest);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.03);
}

function synthWhoosh(ctx: AudioContext, dest: AudioNode) {
  const bufferSize = ctx.sampleRate * 0.25;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.setValueAtTime(1000, ctx.currentTime);
  bandpass.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.25);
  bandpass.Q.value = 2;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

  source.connect(bandpass).connect(gain).connect(dest);
  source.start(ctx.currentTime);
  source.stop(ctx.currentTime + 0.25);
}

function synthThemeChange(ctx: AudioContext, dest: AudioNode) {
  const now = ctx.currentTime;

  [523.25, 659.25].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + i * 0.1);
    gain.gain.linearRampToValueAtTime(0.2, now + i * 0.1 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.2);
    osc.connect(gain).connect(dest);
    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.2);
  });
}

// --- SoundManager class ---

export class SoundManager {
  private static instance: SoundManager | null = null;

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private bufferCache = new Map<string, AudioBuffer>();
  private settings: SoundSettings;
  private activeLoops = new Map<string, { stop: () => void }>();
  private activeThemeSongKey: string | null = null;

  private constructor() {
    this.settings = this.loadSettings();
  }

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  static resetInstance(): void {
    if (SoundManager.instance) {
      SoundManager.instance.dispose();
      SoundManager.instance = null;
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.masterGain.gain.value = 1;
        this.applyVolume();
        this.sfxGain.connect(this.masterGain);
        this.musicGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    return this.ctx;
  }

  resume(): void {
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'suspended') return;
    void ctx.resume();
  }

  async preloadAll(extraUrls: string[] = []): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const fileUrls = Object.values(SOUND_DEFS)
      .filter((def): def is SoundDef & { url: string } => def.type === 'file' && !!def.url)
      .map((def) => def.url);

    const urls = [...new Set([...fileUrls, ...extraUrls])];

    await Promise.all(
      urls.map(async (url) => {
        await this.loadBuffer(ctx, url);
      })
    );
  }

  private async loadBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
    const cached = this.bufferCache.get(url);
    if (cached) return cached;

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      this.bufferCache.set(url, audioBuffer);
      return audioBuffer;
    } catch {
      return null;
    }
  }

  play(key: SoundKey): void {
    if (this.settings.sfxMuted) return;

    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const def = SOUND_DEFS[key];
    if (!def) return;

    if (def.type === 'synth' && def.synthFn) {
      def.synthFn(ctx, this.sfxGain);
      return;
    }

    if (def.type === 'file') {
      if (def.url) {
        const buffer = this.bufferCache.get(def.url);
        if (buffer) {
          this.playBufferedFile(ctx, buffer, this.sfxGain, def.gain ?? 1);
        } else {
          // Lazy-load and play
          this.loadAndPlay(def.url, def.gain ?? 1);
        }
      }
    }
  }

  startLoop(key: SoundKey): void {
    if (this.settings.sfxMuted) return;
    if (this.activeLoops.has(key)) return;

    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const def = SOUND_DEFS[key];
    if (def.type === 'file' && def.url) {
      this.startFileLoop(key, def.url, this.sfxGain, 0.08);
      return;
    }

    if (def.type === 'synth' && def.synthFn) {
      def.synthFn(ctx, this.sfxGain);
    }
  }

  stopLoop(key: SoundKey | string): void {
    const loop = this.activeLoops.get(key);
    if (loop) {
      loop.stop();
      this.activeLoops.delete(key);
    }
  }

  startThemeSong(url: string): void {
    if (this.settings.musicMuted) return;

    const loopKey = `theme-song:${url}`;
    if (this.activeThemeSongKey === loopKey && this.activeLoops.has(loopKey)) {
      return;
    }

    this.stopThemeSong();
    this.activeThemeSongKey = loopKey;
    if (!this.musicGain) {
      this.ensureContext();
    }
    if (!this.musicGain) return;
    void this.startFileLoop(loopKey, url, this.musicGain, 0.18);
  }

  stopThemeSong(): void {
    if (!this.activeThemeSongKey) return;
    this.stopLoop(this.activeThemeSongKey);
    this.activeThemeSongKey = null;
  }

  private playBufferedFile(ctx: AudioContext, buffer: AudioBuffer, destination: GainNode, gainValue: number): void {
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    source.connect(gain).connect(destination);
    source.start(0);
  }

  private async loadAndPlay(url: string, gainValue = 1): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const audioBuffer = await this.loadBuffer(ctx, url);
    if (!audioBuffer) return;
    this.playBufferedFile(ctx, audioBuffer, this.sfxGain, gainValue);
  }

  private async startFileLoop(key: string, url: string, destination: GainNode, volume = 0.08): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx || this.activeLoops.has(key)) return;

    const buffer = await this.loadBuffer(ctx, url);
    if (!buffer) return;

    if (this.activeLoops.has(key)) return;

    // If this is a theme song that was superseded during loading, don't start it
    if (key.startsWith('theme-song:') && this.activeThemeSongKey !== key) return;

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    source.loop = true;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    source.connect(gain).connect(destination);
    source.start(0);

    this.activeLoops.set(key, {
      stop: () => {
        const now = ctx.currentTime;
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        source.stop(now + 0.2);
      },
    });
  }

  getSettings(): SoundSettings {
    return { ...this.settings };
  }

  setSfxMuted(muted: boolean): void {
    this.settings.sfxMuted = muted;
    this.applyVolume();
    this.saveSettings();

    if (muted) {
      this.stopLoop('loadingLoop');
    }
  }

  setSfxVolume(volume: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(1, volume));
    this.applyVolume();
    this.saveSettings();
  }

  setMusicMuted(muted: boolean): void {
    this.settings.musicMuted = muted;
    this.applyVolume();
    this.saveSettings();

    if (muted) {
      this.stopThemeSong();
    }
  }

  setMusicVolume(volume: number): void {
    this.settings.musicVolume = Math.max(0, Math.min(1, volume));
    this.applyVolume();
    this.saveSettings();
  }

  private applyVolume(): void {
    if (this.sfxGain) {
      this.sfxGain.gain.value = this.settings.sfxMuted ? 0 : this.settings.sfxVolume;
    }
    if (this.musicGain) {
      this.musicGain.gain.value = this.settings.musicMuted ? 0 : this.settings.musicVolume;
    }
  }

  private loadSettings(): SoundSettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SoundSettings> & {
          muted?: boolean;
          volume?: number;
        };

        if (typeof parsed.sfxMuted === 'boolean' && typeof parsed.sfxVolume === 'number' && typeof parsed.musicMuted === 'boolean' && typeof parsed.musicVolume === 'number') {
          return parsed as SoundSettings;
        }

        if (typeof parsed.muted === 'boolean' && typeof parsed.volume === 'number') {
          return {
            sfxMuted: parsed.muted,
            sfxVolume: parsed.volume,
            musicMuted: parsed.muted,
            musicVolume: DEFAULT_SETTINGS.musicVolume,
          };
        }
      }
    } catch {
      // Corrupted data — use defaults
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    notifyStoredValueChanged(SETTINGS_KEY);
  }

  private dispose(): void {
    for (const key of this.activeLoops.keys()) {
      this.stopLoop(key);
    }
    this.bufferCache.clear();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
      this.sfxGain = null;
      this.musicGain = null;
    }
  }
}

export type { SoundKey };
