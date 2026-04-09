import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/account/AccountStateProvider', () => ({
  useAccountState: vi.fn(),
}));

import { useAccountState } from '@/components/account/AccountStateProvider';
import { usePageProgressSync } from './usePageProgressSync';

describe('usePageProgressSync', () => {
  beforeEach(() => {
    vi.mocked(useAccountState).mockReset();
  });

  it('maps account boot state and signed-in refresh state', () => {
    vi.mocked(useAccountState).mockReturnValue({
      isBooting: true,
      isBackgroundSyncing: true,
      isSignedIn: true,
    } as ReturnType<typeof useAccountState>);

    const { result } = renderHook(() => usePageProgressSync());

    expect(result.current).toEqual({
      isPageSyncLoading: true,
      isPageBackgroundRefreshing: true,
      isSignedIn: true,
    });
  });

  it('does not mark background refresh when signed out', () => {
    vi.mocked(useAccountState).mockReturnValue({
      isBooting: false,
      isBackgroundSyncing: true,
      isSignedIn: false,
    } as ReturnType<typeof useAccountState>);

    const { result } = renderHook(() => usePageProgressSync());

    expect(result.current).toEqual({
      isPageSyncLoading: false,
      isPageBackgroundRefreshing: false,
      isSignedIn: false,
    });
  });
});
