import { notifyStoredValueChanged } from '@/hooks/useStoredValue';
import type { SoundSettings } from '@/types';

const SETTINGS_KEY = 'birdSoundSettings';
const DEFAULT_SETTINGS: SoundSettings = { muted: false, volume: 0.7 };

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
}

const SOUND_DEFS: Record<SoundKey, SoundDef> = {
  tap: { type: 'synth', synthFn: synthTap },
  correct: { type: 'file', url: '/sounds/fx/correct.mp3' },
  wrong: { type: 'file', url: '/sounds/fx/wrong.mp3' },
  streak: { type: 'file', url: '/sounds/fx/streak.mp3' },
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
  private bufferCache = new Map<string, AudioBuffer>();
  private settings: SoundSettings;
  private activeLoops = new Map<SoundKey, { stop: () => void }>();

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
        this.masterGain.gain.value = this.settings.muted ? 0 : this.settings.volume;
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

  async preloadAll(): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const fileEntries = Object.entries(SOUND_DEFS).filter(
      (entry): entry is [string, SoundDef & { url: string }] =>
        entry[1].type === 'file' && !!entry[1].url
    );

    await Promise.all(
      fileEntries.map(async ([key, def]) => {
        if (this.bufferCache.has(key)) return;
        try {
          const response = await fetch(def.url);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          this.bufferCache.set(key, audioBuffer);
        } catch {
          // File may not exist yet — silently skip
        }
      })
    );
  }

  play(key: SoundKey): void {
    if (this.settings.muted) return;

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const def = SOUND_DEFS[key];
    if (!def) return;

    if (def.type === 'synth' && def.synthFn) {
      def.synthFn(ctx, this.masterGain);
      return;
    }

    if (def.type === 'file') {
      const buffer = this.bufferCache.get(key);
      if (buffer) {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.masterGain);
        source.start(0);
      } else if (def.url) {
        // Lazy-load and play
        this.loadAndPlay(key, def.url);
      }
    }
  }

  startLoop(key: SoundKey): void {
    if (this.settings.muted) return;
    if (this.activeLoops.has(key)) return;

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const def = SOUND_DEFS[key];
    if (def.type === 'file' && def.url) {
      this.startFileLoop(key, def.url);
      return;
    }

    if (def.type === 'synth' && def.synthFn) {
      def.synthFn(ctx, this.masterGain);
    }
  }

  stopLoop(key: SoundKey): void {
    const loop = this.activeLoops.get(key);
    if (loop) {
      loop.stop();
      this.activeLoops.delete(key);
    }
  }

  private async loadAndPlay(key: string, url: string): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      this.bufferCache.set(key, audioBuffer);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.masterGain);
      source.start(0);
    } catch {
      // Silently fail — audio is non-critical
    }
  }

  private async startFileLoop(key: SoundKey, url: string): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.activeLoops.has(key)) return;

    let buffer = this.bufferCache.get(key);

    if (!buffer) {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        buffer = await ctx.decodeAudioData(arrayBuffer);
        this.bufferCache.set(key, buffer);
      } catch {
        return;
      }
    }

    if (this.activeLoops.has(key)) return;

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    source.loop = true;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    source.connect(gain).connect(this.masterGain);
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

  setMuted(muted: boolean): void {
    this.settings.muted = muted;
    this.applyVolume();
    this.saveSettings();

    if (muted) {
      for (const key of this.activeLoops.keys()) {
        this.stopLoop(key as SoundKey);
      }
    }
  }

  setVolume(volume: number): void {
    this.settings.volume = Math.max(0, Math.min(1, volume));
    this.applyVolume();
    this.saveSettings();
  }

  private applyVolume(): void {
    if (this.masterGain) {
      this.masterGain.gain.value = this.settings.muted ? 0 : this.settings.volume;
    }
  }

  private loadSettings(): SoundSettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return JSON.parse(raw) as SoundSettings;
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
      this.stopLoop(key as SoundKey);
    }
    this.bufferCache.clear();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
    }
  }
}

export type { SoundKey };
