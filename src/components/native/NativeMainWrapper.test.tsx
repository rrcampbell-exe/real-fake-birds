import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useHasHydrated', () => ({
  useHasHydrated: vi.fn(),
}));

vi.mock('@/lib/native/platform', () => ({
  isNativePlatform: vi.fn(),
}));

import { useHasHydrated } from '@/hooks/useHasHydrated';
import { isNativePlatform } from '@/lib/native/platform';
import NativeMainWrapper from './NativeMainWrapper';

describe('NativeMainWrapper', () => {
  it('renders children inside a <main> element', () => {
    vi.mocked(useHasHydrated).mockReturnValue(false);
    vi.mocked(isNativePlatform).mockReturnValue(false);

    const { container, getByText } = render(
      <NativeMainWrapper>hello world</NativeMainWrapper>
    );

    expect(container.querySelector('main')).toBeInTheDocument();
    expect(getByText('hello world')).toBeInTheDocument();
  });

  it('applies native bottom padding when hydrated and running in native shell', () => {
    vi.mocked(useHasHydrated).mockReturnValue(true);
    vi.mocked(isNativePlatform).mockReturnValue(true);

    const { container } = render(<NativeMainWrapper>content</NativeMainWrapper>);
    const main = container.querySelector('main');

    expect(main?.className).toContain('pb-[calc(env(safe-area-inset-bottom)+3rem)]');
  });

  it('applies web bottom padding when hydrated but not native', () => {
    vi.mocked(useHasHydrated).mockReturnValue(true);
    vi.mocked(isNativePlatform).mockReturnValue(false);

    const { container } = render(<NativeMainWrapper>content</NativeMainWrapper>);
    const main = container.querySelector('main');

    expect(main?.className).toContain('pb-16');
  });

  it('applies web bottom padding when not yet hydrated (even if native)', () => {
    vi.mocked(useHasHydrated).mockReturnValue(false);
    vi.mocked(isNativePlatform).mockReturnValue(true);

    const { container } = render(<NativeMainWrapper>content</NativeMainWrapper>);
    const main = container.querySelector('main');

    expect(main?.className).toContain('pb-16');
  });
});
