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
    vi.restoreAllMocks();
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
        text: 'Check out my stats.',
        url: window.location.origin,
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
      expect(writeText).toHaveBeenCalledWith(`I scored 4/5 today.\n${window.location.origin}`);
    });
  });

  it('attaches a generated image file when file sharing is supported', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    vi.stubGlobal('navigator', {
      share,
      canShare,
      clipboard: undefined,
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['png-data'], { type: 'image/png' }),
    }));

    render(
      <ShareButton
        payload={{ title: 'Real Fake Birds leaderboard', text: 'I am currently sitting at #3.' }}
        eventLabel="weekly-leaderboard"
        imageParams={{
          type: 'leaderboard-rank',
          params: {
            challengeName: 'Seed Collector',
            username: 'BirdFan',
            rank: 3,
            score: '42',
            isFinal: false,
          },
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));

    await waitFor(() => {
      expect(canShare).toHaveBeenCalledWith({ files: [expect.any(File)] });
      expect(share).toHaveBeenCalledWith({
        title: 'Real Fake Birds leaderboard',
        text: 'I am currently sitting at #3.',
        url: `${window.location.origin}/share?type=leaderboard-rank&challengeName=Seed+Collector&username=BirdFan&rank=3&score=42&isFinal=false`,
        files: [expect.any(File)],
      });
    });
  });
});