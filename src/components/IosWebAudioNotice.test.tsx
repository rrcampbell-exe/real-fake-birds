import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IosWebAudioNotice, { IOS_WEB_AUDIO_NOTICE_DISMISSED_STORAGE_KEY } from './IosWebAudioNotice';

vi.mock('@/components/account/AccountStateProvider', () => ({
  useAccountState: vi.fn(() => ({
    isAppChromeVisible: true,
  })),
}));

import { useAccountState } from '@/components/account/AccountStateProvider';

const originalMatchMedia = window.matchMedia;
const navigatorOverrides: Array<() => void> = [];

function createAccountState(overrides: Partial<ReturnType<typeof useAccountState>> = {}): ReturnType<typeof useAccountState> {
  return {
    isLoadingAccount: false,
    isSignedIn: false,
    isBooting: false,
    isBackgroundSyncing: false,
    isAppChromeVisible: true,
    accountEmail: null,
    accountUsername: null,
    remoteSummary: null,
    remoteUnlockedThemes: [],
    weeklyOverview: null,
    refreshAccountState: vi.fn().mockResolvedValue(undefined),
    syncSignedInProgress: vi.fn().mockResolvedValue(undefined),
    isHouseAccount: false,
    ...overrides,
  };
}

function mockNavigator(value: Partial<Navigator>) {
  for (const [key, descriptorValue] of Object.entries(value)) {
    const originalDescriptor = Object.getOwnPropertyDescriptor(window.navigator, key);

    Object.defineProperty(window.navigator, key, {
      configurable: true,
      value: descriptorValue,
    });

    navigatorOverrides.push(() => {
      if (originalDescriptor) {
        Object.defineProperty(window.navigator, key, originalDescriptor);
        return;
      }

      delete (window.navigator as Navigator & Record<string, unknown>)[key];
    });
  }
}

beforeEach(() => {
  localStorage.clear();
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    media: '(display-mode: standalone)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

afterEach(() => {
  while (navigatorOverrides.length > 0) {
    navigatorOverrides.pop()?.();
  }

  window.matchMedia = originalMatchMedia;
});

describe('IosWebAudioNotice', () => {
  it('shows on iPhone browsers and can be dismissed', async () => {
    vi.mocked(useAccountState).mockReturnValue(createAccountState({ isAppChromeVisible: true }));
    mockNavigator({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', platform: 'iPhone', maxTouchPoints: 5 });

    render(<IosWebAudioNotice />);

    expect(await screen.findByText('iPhone web audio tip')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss iPhone audio notice' }));

    expect(localStorage.getItem(IOS_WEB_AUDIO_NOTICE_DISMISSED_STORAGE_KEY)).toBe('true');
    expect(screen.queryByText('iPhone web audio tip')).not.toBeInTheDocument();
  });

  it('does not show on non-iOS devices', () => {
    vi.mocked(useAccountState).mockReturnValue(createAccountState({ isAppChromeVisible: true }));
    mockNavigator({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)', platform: 'MacIntel', maxTouchPoints: 0 });

    render(<IosWebAudioNotice />);

    expect(screen.queryByText('iPhone web audio tip')).not.toBeInTheDocument();
  });

  it('does not show when already dismissed', () => {
    vi.mocked(useAccountState).mockReturnValue(createAccountState({ isAppChromeVisible: true }));
    mockNavigator({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', platform: 'iPhone', maxTouchPoints: 5 });
    localStorage.setItem(IOS_WEB_AUDIO_NOTICE_DISMISSED_STORAGE_KEY, 'true');

    render(<IosWebAudioNotice />);

    expect(screen.queryByText('iPhone web audio tip')).not.toBeInTheDocument();
  });

  it('does not show until the app chrome is visible', () => {
    vi.mocked(useAccountState).mockReturnValue(createAccountState({ isAppChromeVisible: false }));
    mockNavigator({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', platform: 'iPhone', maxTouchPoints: 5 });

    render(<IosWebAudioNotice />);

    expect(screen.queryByText('iPhone web audio tip')).not.toBeInTheDocument();
  });
});