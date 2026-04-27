import { notifyStoredValueChanged } from '@/hooks/useStoredValue';
import type { SoundSettings } from '@/types';
import type { SoundController, SoundKey } from '@/lib/sound/types';

/**
 * Asset IDs for sounds that ship as bundled files.
 * Synth-only sounds (tap, collect, release, whoosh, navTap, themeChange,
 * hintFieldLoading, hintImageLoading, hintReveal) are silently skipped on
 * native since they have no file equivalent.
 */
const NATIVE_ASSET_MAP: Partial<Record<SoundKey, string>> = {
  correct: 'correct',
  wrong: 'wrong',
  error: 'error',
  streak: 'streak',
  milestone: 'milestone',
  loadingLoop: 'loadingLoop',
};

/**
 * Relative paths inside the app bundle.
 * These match the files copied to native targets during `cap sync`.
 */
const NATIVE_ASSET_PATH: Record<string, string> = {
  correct: 'public/sounds/fx/correct.mp3',
  wrong: 'public/sounds/fx/wrong.mp3',
  error: 'public/sounds/fx/error.mp3',
  streak: 'public/sounds/fx/streak.mp3',
  milestone: 'public/sounds/fx/milestone.mp3',
  loadingLoop: 'public/sounds/fx/loading.mp3',
};

const SETTINGS_KEY = 'birdSoundSettings';
const DEFAULT_SETTINGS: SoundSettings = {
  sfxMuted: false,
  sfxVolume: 0.7,
  musicMuted: false,
  musicVolume: 1,
};

type NativeAudioModule = typeof import('@capacitor-community/native-audio');

/**
 * Sound controller that routes audio through the Capacitor NativeAudio plugin.
 * Active only inside the native shell (iOS / Android). On web the platform
 * check in sound-platform.ts falls through to SoundManager instead.
 */
export class CapacitorSoundController implements SoundController {
  private settings: SoundSettings;
  private preloaded = new Set<string>();
  private activeLoops = new Set<string>();
  private activeThemeSongId: string | null = null;
  private desiredThemeSongUrl: string | null = null;

  constructor() {
    this.settings = this.loadSettings();
  }

  // ─── Gesture unlock (no-op on native) ──────────────────────────────────────

  registerGestureUnlock(): void {
    // Not required on native platforms.
  }

  async unlock(): Promise<void> {
    // Not required on native platforms; NativeAudio doesn't need an unlock.
    await this.preloadAll();
  }

  // ─── Preloading ─────────────────────────────────────────────────────────────

  async preloadAll(extraUrls: string[] = []): Promise<void> {
    // extraUrls are web-only theme song URLs; ignore them on native.
    void extraUrls;

    const NativeAudio = await this.getNativeAudio();
    if (!NativeAudio) return;

    await Promise.all(
      Object.entries(NATIVE_ASSET_PATH).map(async ([assetId, assetPath]) => {
        if (this.preloaded.has(assetId)) return;
        try {
          await NativeAudio.preload({
            assetId,
            assetPath,
            audioChannelNum: 1,
            isUrl: false,
          });
          this.preloaded.add(assetId);
        } catch {
          // Best-effort; the sound will be skipped if it cannot be preloaded.
        }
      })
    );
  }

  // ─── Playback ────────────────────────────────────────────────────────────────

  play(key: SoundKey): void {
    if (this.settings.sfxMuted) return;
    const assetId = NATIVE_ASSET_MAP[key];
    if (!assetId) return;

    void (async () => {
      const NativeAudio = await this.getNativeAudio();
      if (!NativeAudio) return;
      try {
        if (!this.preloaded.has(assetId)) {
          await NativeAudio.preload({
            assetId,
            assetPath: NATIVE_ASSET_PATH[assetId] ?? '',
            audioChannelNum: 1,
            isUrl: false,
          });
          this.preloaded.add(assetId);
        }
        await NativeAudio.play({ assetId });
        await NativeAudio.setVolume({ assetId, volume: this.settings.sfxVolume });
      } catch {
        // Ignore playback errors.
      }
    })();
  }

  startLoop(key: SoundKey): void {
    if (this.settings.sfxMuted) return;
    const assetId = NATIVE_ASSET_MAP[key];
    if (!assetId || this.activeLoops.has(assetId)) return;

    this.activeLoops.add(assetId);
    void (async () => {
      const NativeAudio = await this.getNativeAudio();
      if (!NativeAudio) return;
      try {
        if (!this.preloaded.has(assetId)) {
          await NativeAudio.preload({
            assetId,
            assetPath: NATIVE_ASSET_PATH[assetId] ?? '',
            audioChannelNum: 1,
            isUrl: false,
          });
          this.preloaded.add(assetId);
        }
        await NativeAudio.loop({ assetId });
        await NativeAudio.setVolume({ assetId, volume: this.settings.sfxVolume * 0.08 });
      } catch {
        this.activeLoops.delete(assetId);
      }
    })();
  }

  stopLoop(key: SoundKey | string): void {
    const assetId = typeof key === 'string' && key in NATIVE_ASSET_MAP
      ? NATIVE_ASSET_MAP[key as SoundKey]
      : undefined;
    if (!assetId) return;

    if (!this.activeLoops.has(assetId)) return;
    this.activeLoops.delete(assetId);

    void (async () => {
      const NativeAudio = await this.getNativeAudio();
      if (!NativeAudio) return;
      try {
        await NativeAudio.stop({ assetId });
      } catch {
        // Ignore stop errors.
      }
    })();
  }

  startThemeSong(url: string): void {
    if (this.settings.musicMuted) return;
    this.desiredThemeSongUrl = url;

    // Theme songs are remote URLs; play them as web audio via NativeAudio.
    const songId = `theme-song:${url}`;
    if (this.activeThemeSongId === songId) return;

    void (async () => {
      const NativeAudio = await this.getNativeAudio();
      if (!NativeAudio) return;

      // Stop any currently playing theme song.
      await this.stopThemeSongAsync(NativeAudio);

      try {
        if (!this.preloaded.has(songId)) {
          await NativeAudio.preload({
            assetId: songId,
            assetPath: url,
            audioChannelNum: 1,
            isUrl: true,
          });
          this.preloaded.add(songId);
        }
        this.activeThemeSongId = songId;
        await NativeAudio.loop({ assetId: songId });
        await NativeAudio.setVolume({ assetId: songId, volume: this.settings.musicVolume * 0.18 });
      } catch {
        this.activeThemeSongId = null;
      }
    })();
  }

  stopThemeSong(): void {
    this.desiredThemeSongUrl = null;
    void (async () => {
      const NativeAudio = await this.getNativeAudio();
      if (!NativeAudio) return;
      await this.stopThemeSongAsync(NativeAudio);
    })();
  }

  stopAllLoops(): void {
    const loopIds = [...this.activeLoops];
    this.activeLoops.clear();

    void (async () => {
      const NativeAudio = await this.getNativeAudio();
      if (!NativeAudio) return;
      for (const assetId of loopIds) {
        try {
          await NativeAudio.stop({ assetId });
        } catch {
          // Ignore.
        }
      }
    })();

    this.stopThemeSong();
  }

  // ─── Settings ───────────────────────────────────────────────────────────────

  getSettings(): SoundSettings {
    return { ...this.settings };
  }

  setSfxMuted(muted: boolean): void {
    this.settings.sfxMuted = muted;
    this.saveSettings();
    if (muted) this.stopLoop('loadingLoop');
  }

  setSfxVolume(volume: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }

  setMusicMuted(muted: boolean): void {
    this.settings.musicMuted = muted;
    this.saveSettings();
    if (muted) {
      this.stopThemeSong();
      return;
    }
    if (this.desiredThemeSongUrl) {
      this.startThemeSong(this.desiredThemeSongUrl);
    }
  }

  setMusicVolume(volume: number): void {
    this.settings.musicVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────────────

  dispose(): void {
    this.stopAllLoops();

    void (async () => {
      const NativeAudio = await this.getNativeAudio();
      if (!NativeAudio) return;
      for (const assetId of this.preloaded) {
        try {
          await NativeAudio.unload({ assetId });
        } catch {
          // Ignore.
        }
      }
      this.preloaded.clear();
    })();
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async getNativeAudio(): Promise<NativeAudioModule['NativeAudio'] | null> {
    try {
      const { NativeAudio } = await import('@capacitor-community/native-audio');
      return NativeAudio;
    } catch {
      return null;
    }
  }

  private async stopThemeSongAsync(NativeAudio: NativeAudioModule['NativeAudio']): Promise<void> {
    const previous = this.activeThemeSongId;
    this.activeThemeSongId = null;
    if (!previous) return;
    try {
      await NativeAudio.stop({ assetId: previous });
    } catch {
      // Ignore.
    }
  }

  private loadSettings(): SoundSettings {
    if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SoundSettings> & {
          muted?: boolean;
          volume?: number;
        };

        if (
          typeof parsed.sfxMuted === 'boolean' &&
          typeof parsed.sfxVolume === 'number' &&
          typeof parsed.musicMuted === 'boolean' &&
          typeof parsed.musicVolume === 'number'
        ) {
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
      // Corrupted data — use defaults.
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    notifyStoredValueChanged(SETTINGS_KEY);
  }
}
