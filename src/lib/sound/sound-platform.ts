import { SoundManager } from '@/lib/sound/sound-manager';
import { CapacitorSoundController } from '@/lib/sound/capacitor-sound-controller';
import { isNativePlatform } from '@/lib/native/platform';
import type { SoundController } from '@/lib/sound/types';

let soundController: SoundController | null = null;

/**
 * Returns true when the WebView is connected to an external server rather than
 * loading assets from the native app bundle.
 *
 * Bundle mode uses capacitor://localhost (iOS) or file:// (Android) as the
 * origin, which means bundled SFX assets are available to NativeAudio.
 *
 * Any http: or https: origin means the WebView is pointed at an external
 * server (dev localhost or the production HTTPS server). In that case bundled
 * assets are NOT present in the app bundle, so we fall back to SoundManager
 * (Web Audio) which fetches files from the remote origin instead.
 */
function isLiveReload(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // capacitor:// (iOS bundle) and file:// (Android bundle) → bundled assets
  // http: (dev server) or https: (remote prod server) → no bundled assets
  const protocol = window.location.protocol;
  return protocol === 'http:' || protocol === 'https:';
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