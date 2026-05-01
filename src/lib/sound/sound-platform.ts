import { SoundManager } from '@/lib/sound/sound-manager';
import { CapacitorSoundController } from '@/lib/sound/capacitor-sound-controller';
import { isNativePlatform } from '@/lib/native/platform';
import type { SoundController } from '@/lib/sound/types';

let soundController: SoundController | null = null;

/**
 * Returns true when running in Capacitor live-reload mode (native shell but
 * WebView pointed at a local dev server). In this mode the app bundle contains
 * no sound files, so NativeAudio cannot load bundled assets. We fall back to
 * web audio until a production build is made and synced.
 */
function isLiveReload(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // Capacitor live-reload points the WebView at an HTTP dev server (localhost,
  // LAN IP, etc.). In this mode, native bundled assets are not present.
  return window.location.protocol === 'http:';
}

function createSoundController(): SoundController {
  if (isNativePlatform() && !isLiveReload()) {
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