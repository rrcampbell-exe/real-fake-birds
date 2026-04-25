import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/native/platform', () => ({
  isNativePlatform: vi.fn(),
}));

vi.mock('@capacitor/browser', () => ({
  Browser: {
    open: vi.fn(),
  },
}));

import { Browser } from '@capacitor/browser';
import { isNativePlatform } from '@/lib/native/platform';
import ExternalLink from './ExternalLink';

describe('ExternalLink', () => {
  beforeEach(() => {
    vi.mocked(Browser.open).mockResolvedValue(undefined);
  });

  it('renders as a normal anchor with correct href, target, and rel', () => {
    vi.mocked(isNativePlatform).mockReturnValue(false);

    render(<ExternalLink href="https://example.com">Visit</ExternalLink>);
    const link = screen.getByRole('link', { name: 'Visit' });

    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('opens URL via Browser.open in native shell and prevents default navigation', async () => {
    vi.mocked(isNativePlatform).mockReturnValue(true);

    render(<ExternalLink href="https://example.com">Visit</ExternalLink>);
    fireEvent.click(screen.getByRole('link', { name: 'Visit' }));

    await waitFor(() => {
      expect(Browser.open).toHaveBeenCalledWith({ url: 'https://example.com' });
    });
  });

  it('does not call Browser.open when running on web', async () => {
    vi.mocked(isNativePlatform).mockReturnValue(false);

    render(<ExternalLink href="https://example.com">Visit</ExternalLink>);
    fireEvent.click(screen.getByRole('link', { name: 'Visit' }));

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(Browser.open).not.toHaveBeenCalled();
  });

  it('calls the provided onClick handler after handling the click', async () => {
    vi.mocked(isNativePlatform).mockReturnValue(false);
    const onClick = vi.fn();

    render(
      <ExternalLink href="https://example.com" onClick={onClick}>
        Visit
      </ExternalLink>
    );
    fireEvent.click(screen.getByRole('link', { name: 'Visit' }));

    await waitFor(() => {
      expect(onClick).toHaveBeenCalled();
    });
  });

  it('calls the provided onClick handler in native shell after Browser.open', async () => {
    vi.mocked(isNativePlatform).mockReturnValue(true);
    const onClick = vi.fn();

    render(
      <ExternalLink href="https://example.com" onClick={onClick}>
        Visit
      </ExternalLink>
    );
    fireEvent.click(screen.getByRole('link', { name: 'Visit' }));

    await waitFor(() => {
      expect(Browser.open).toHaveBeenCalled();
      expect(onClick).toHaveBeenCalled();
    });
  });
});
