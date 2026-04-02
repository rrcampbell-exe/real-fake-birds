import type { SoundSettings } from '@/types';

export type SoundKey =
  | 'tap'
  | 'correct'
  | 'wrong'
  | 'streak'
  | 'milestone'
  | 'whoosh'
  | 'navTap'
  | 'themeChange'
  | 'loadingLoop';

export interface SoundController {
  unlock(): Promise<void>;
  preloadAll(extraUrls?: string[]): Promise<void>;
  play(key: SoundKey): void;
  startLoop(key: SoundKey): void;
  stopLoop(key: SoundKey | string): void;
  startThemeSong(url: string): void;
  stopThemeSong(): void;
  getSettings(): SoundSettings;
  setSfxMuted(muted: boolean): void;
  setSfxVolume(volume: number): void;
  setMusicMuted(muted: boolean): void;
  setMusicVolume(volume: number): void;
}