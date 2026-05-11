import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockHide = vi.fn();
const mockPreloadAll = vi.fn();
const mockIsNativePlatform = vi.fn();
const mockMarkLaunchStage = vi.fn();

vi.mock('@/lib/native/platform', () => ({
  isNativePlatform: () => mockIsNativePlatform(),
}));

vi.mock('@capacitor/splash-screen', () => ({
  SplashScreen: {
    hide: (...args: unknown[]) => mockHide(...args),
  },
}));

vi.mock('@/lib/sound/sound-platform', () => ({
  getSoundController: () => ({
    preloadAll: mockPreloadAll,
  }),
}));

vi.mock('@/lib/native/launch-metrics', () => ({
  markLaunchStage: (...args: unknown[]) => mockMarkLaunchStage(...args),
}));

import NativeSplashHandler from './NativeSplashHandler';

describe('NativeSplashHandler', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-app-booting');
    document.body.innerHTML = '';
    mockHide.mockReset();
    mockHide.mockResolvedValue(undefined);
    mockPreloadAll.mockReset();
    mockPreloadAll.mockResolvedValue(undefined);
    mockIsNativePlatform.mockReset();
    mockIsNativePlatform.mockReturnValue(true);
    mockMarkLaunchStage.mockReset();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
  });

  it('returns early outside the native shell', async () => {
    mockIsNativePlatform.mockReturnValue(false);

    render(<NativeSplashHandler />);

    await waitFor(() => {
      expect(mockHide).not.toHaveBeenCalled();
    });
  });

  it('hides the native splash once the boot overlay is ready and warms audio after', async () => {
    document.documentElement.setAttribute('data-app-booting', 'true');

    const overlay = document.createElement('div');
    overlay.setAttribute('data-boot-overlay', 'true');
    document.body.appendChild(overlay);

    render(<NativeSplashHandler />);

    await waitFor(() => {
      expect(mockHide).toHaveBeenCalledWith({ fadeOutDuration: 300 });
    });

    await waitFor(() => {
      expect(mockPreloadAll).toHaveBeenCalled();
    });

    expect(mockMarkLaunchStage).toHaveBeenCalledWith('boot-overlay-painted', undefined, { once: true });
    expect(mockMarkLaunchStage).toHaveBeenCalledWith(
      'native-splash-hidden',
      { fadeOutDurationMs: 300 },
      { once: true }
    );
  });
});
