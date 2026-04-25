import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ShareButton from './ShareButton';

const trackMock = vi.fn();

vi.mock('@/lib/analytics', () => ({
  track: (...args: unknown[]) => trackMock(...args),
}));

describe('ShareButton', () => {
  beforeEach(() => {
    trackMock.mockReset();
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/rewards');
  });

  it('shares a full app URL with the native share API', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      share,
      clipboard: undefined,
    });

    render(
      <ShareButton
        payload={{ title: 'Real Fake Birds stats', text: 'Check out my stats.' }}
        eventLabel="stats"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));

    await waitFor(() => {
      expect(share).toHaveBeenCalledWith({
        title: 'Real Fake Birds stats',
        text: `Check out my stats.\n${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}`,
      });
    });
  });

  it('copies the share text and full app URL to the clipboard when native share is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText,
      },
    });

    render(
      <ShareButton
        payload={{ title: 'Real Fake Birds daily', text: 'I scored 4/5 today.' }}
        eventLabel="daily-summary"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(`I scored 4/5 today.\n${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}`);
    });
  });
});