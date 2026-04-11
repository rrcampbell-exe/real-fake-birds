import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/analytics', () => ({
  track: vi.fn(),
}));

import { useScreenViewed } from './useScreenViewed';
import { track } from '@/lib/analytics';

describe('useScreenViewed', () => {
  beforeEach(() => {
    vi.mocked(track).mockClear();
  });

  it('fires screen_viewed with the given screen name on mount', () => {
    renderHook(() => useScreenViewed('home'));
    expect(track).toHaveBeenCalledOnce();
    expect(track).toHaveBeenCalledWith('screen_viewed', { screen: 'home' });
  });

  it('fires only once per mount even on re-renders', () => {
    const { rerender } = renderHook(({ name }: { name: string }) => useScreenViewed(name), {
      initialProps: { name: 'home' },
    });
    rerender({ name: 'home' });
    rerender({ name: 'home' });
    expect(track).toHaveBeenCalledOnce();
  });

  it('fires for the initial screen name even if the prop changes later', () => {
    const { rerender } = renderHook(({ name }: { name: string }) => useScreenViewed(name), {
      initialProps: { name: 'home' },
    });
    rerender({ name: 'settings' });
    expect(track).toHaveBeenCalledOnce();
    expect(track).toHaveBeenCalledWith('screen_viewed', { screen: 'home' });
  });
});
