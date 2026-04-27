import { SoundManager } from '@/lib/sound/sound-manager';
import { CapacitorSoundController } from '@/lib/sound/capacitor-sound-controller';
import { isNativePlatform } from '@/lib/native/platform';
import type { SoundController } from '@/lib/sound/types';

let soundController: SoundController | null = null;

function createSoundController(): SoundController {
  if (isNativePlatform()) {
    return new CapacitorSoundController();
  }
  return SoundManager.getInstance();
}

export function getSoundController(): SoundController {
  if (!soundController) {
    soundController = createSoundController();
  }

  return soundController;
}

export function setSoundController(controller: SoundController): void {
  soundController = controller;
}

export function resetSoundController(): void {
  soundController = null;
  SoundManager.resetInstance();
}