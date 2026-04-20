import type { SoundSettings } from '@/types';

export type SoundKey =
  | 'tap'
  | 'correct'
  | 'wrong'
  | 'error'
  | 'collect'
  | 'release'
  | 'streak'
  | 'milestone'
  | 'whoosh'
  | 'navTap'
  | 'themeChange'
  | 'hintFieldLoading'
  | 'hintImageLoading'
  | 'hintReveal'
  | 'loadingLoop';

export interface SoundController {
  registerGestureUnlock(): void;
  unlock(): Promise<void>;
  preloadAll(extraUrls?: string[]): Promise<void>;
  play(key: SoundKey): void;
  startLoop(key: SoundKey): void;
  stopLoop(key: SoundKey | string): void;
  startThemeSong(url: string): void;
  stopThemeSong(): void;
  stopAllLoops(): void;
  getSettings(): SoundSettings;
  setSfxMuted(muted: boolean): void;
  setSfxVolume(volume: number): void;
  setMusicMuted(muted: boolean): void;
  setMusicVolume(volume: number): void;
}