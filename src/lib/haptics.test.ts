import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/native/platform', () => ({
  isNativePlatform: vi.fn(),
}));

vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn(),
    notification: vi.fn(),
  },
  ImpactStyle: {
    Light: 'LIGHT',
    Medium: 'MEDIUM',
    Heavy: 'HEAVY',
  },
  NotificationType: {
    Success: 'SUCCESS',
    Error: 'ERROR',
    Warning: 'WARNING',
  },
}));

import { isNativePlatform } from '@/lib/native/platform';
import {
  hapticError,
  hapticHeavy,
  hapticLight,
  hapticMedium,
  hapticSuccess,
  hapticWarning,
} from './haptics';
import { Haptics } from '@capacitor/haptics';

const mockedIsNativePlatform = vi.mocked(isNativePlatform);
const mockedHaptics = vi.mocked(Haptics);

describe('haptics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips haptic calls on the web', async () => {
    mockedIsNativePlatform.mockReturnValue(false);

    await hapticLight();
    await hapticSuccess();

    expect(mockedHaptics.impact).not.toHaveBeenCalled();
    expect(mockedHaptics.notification).not.toHaveBeenCalled();
  });

  it('triggers the supported impact and notification styles on native platforms', async () => {
    mockedIsNativePlatform.mockReturnValue(true);

    await hapticLight();
    await hapticMedium();
    await hapticHeavy();
    await hapticSuccess();
    await hapticError();
    await hapticWarning();

    expect(mockedHaptics.impact).toHaveBeenCalledWith({ style: 'LIGHT' });
    expect(mockedHaptics.impact).toHaveBeenCalledWith({ style: 'MEDIUM' });
    expect(mockedHaptics.impact).toHaveBeenCalledWith({ style: 'HEAVY' });
    expect(mockedHaptics.notification).toHaveBeenCalledWith({ type: 'SUCCESS' });
    expect(mockedHaptics.notification).toHaveBeenCalledWith({ type: 'ERROR' });
    expect(mockedHaptics.notification).toHaveBeenCalledWith({ type: 'WARNING' });
  });

  it('swallows native bridge failures', async () => {
    mockedIsNativePlatform.mockReturnValue(true);
    mockedHaptics.notification.mockRejectedValueOnce(new Error('native bridge failed'));

    await expect(hapticWarning()).resolves.toBeUndefined();
  });
});
