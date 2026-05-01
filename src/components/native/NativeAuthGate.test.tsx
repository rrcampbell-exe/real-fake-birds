import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/components/account/AccountStateProvider', () => ({
  useAccountState: vi.fn(),
}));

vi.mock('@/hooks/useHasHydrated', () => ({
  useHasHydrated: vi.fn(),
}));

vi.mock('@/lib/native/platform', () => ({
  isNativePlatform: vi.fn(),
}));

vi.mock('@/components/auth/UsernameAvailabilityCard', () => ({
  default: ({ onAuthSuccess }: { onAuthSuccess?: () => void }) => (
    <button type="button" onClick={onAuthSuccess}>
      Complete native auth
    </button>
  ),
}));

import { useRouter } from 'next/navigation';
import { useAccountState } from '@/components/account/AccountStateProvider';
import { useHasHydrated } from '@/hooks/useHasHydrated';
import { isNativePlatform } from '@/lib/native/platform';
import NativeAuthGate from './NativeAuthGate';

function createAccountState(
  overrides: Partial<ReturnType<typeof useAccountState>> = {}
): ReturnType<typeof useAccountState> {
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

function setOnlineState(isOnline: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: isOnline,
  });
}

describe('NativeAuthGate', () => {
  const mockReplace = vi.fn();

  beforeEach(() => {
    mockReplace.mockReset();
    sessionStorage.clear();
    setOnlineState(true);
    vi.mocked(useRouter).mockReturnValue({ replace: mockReplace } as ReturnType<typeof useRouter>);
    vi.mocked(useHasHydrated).mockReturnValue(true);
    vi.mocked(isNativePlatform).mockReturnValue(true);
    vi.mocked(useAccountState).mockReturnValue(createAccountState());
  });

  it('renders nothing on web', () => {
    vi.mocked(isNativePlatform).mockReturnValue(false);

    const { container } = render(<NativeAuthGate />);

    expect(container.firstChild).toBeNull();
  });

  it('stays hidden while the boot screen is active', () => {
    vi.mocked(useAccountState).mockReturnValue(createAccountState({ isBooting: true }));

    const { container } = render(<NativeAuthGate />);

    expect(container.firstChild).toBeNull();
  });

  it('stays hidden when the user is already signed in', () => {
    vi.mocked(useAccountState).mockReturnValue(createAccountState({ isSignedIn: true }));

    const { container } = render(<NativeAuthGate />);

    expect(container.firstChild).toBeNull();
  });

  it('persists the offline guest bypass for the rest of the session', async () => {
    setOnlineState(false);

    const firstRender = render(<NativeAuthGate />);

    fireEvent.click(screen.getByRole('button', { name: 'Play as guest (offline)' }));

    await waitFor(() => {
      expect(firstRender.container.firstChild).toBeNull();
    });

    firstRender.unmount();

    const secondRender = render(<NativeAuthGate />);

    expect(secondRender.container.firstChild).toBeNull();
  });

  it('navigates back to the play screen after auth succeeds', () => {
    render(<NativeAuthGate />);

    fireEvent.click(screen.getByRole('button', { name: 'Complete native auth' }));

    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
