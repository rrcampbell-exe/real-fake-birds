import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PublicBirdhousePreviewCard from './PublicBirdhousePreviewCard';

vi.mock('@/components/profile/BirdhousePreviewCard', () => ({
  BirdhousePreviewSection: ({
    latestReal,
    latestFake,
    recentNames,
    emptyMessage,
    viewHref,
    realHref,
    fakeHref,
  }: {
    latestReal: { birdName: string } | null;
    latestFake: { birdName: string } | null;
    recentNames: string[];
    emptyMessage: string;
    viewHref: string;
    realHref: string;
    fakeHref: string;
  }) => (
    <div>
      <div>latest-real:{latestReal?.birdName ?? 'none'}</div>
      <div>latest-fake:{latestFake?.birdName ?? 'none'}</div>
      <div>recent:{recentNames.join('|') || 'none'}</div>
      <div>empty:{emptyMessage}</div>
      <div>view:{viewHref}</div>
      <div>real:{realHref}</div>
      <div>fake:{fakeHref}</div>
    </div>
  ),
}));

describe('PublicBirdhousePreviewCard', () => {
  it('renders an immediate error state when no username is provided', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<PublicBirdhousePreviewCard username="" />);

    expect(screen.getByText('empty:Unable to load this birdhouse preview right now.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows a loading skeleton before the birdhouse request resolves', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)));

    const { container } = render(<PublicBirdhousePreviewCard username="birdlover" />);
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('maps fetched birdhouse entries into preview props', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          kind: 'public-birdhouse',
          username: 'birdlover',
          real: [
            { birdKey: 'blue-jay', imageUrl: null, thumbUrl: null },
            { birdKey: 'american-robin', imageUrl: null, thumbUrl: null },
          ],
          fake: [
            { birdKey: 'fake:paper-eagle', imageUrl: null, thumbUrl: null },
          ],
        }),
      }),
    );

    render(<PublicBirdhousePreviewCard username="birdlover" />);

    await waitFor(() => {
      expect(screen.getByText('latest-real:American Robin')).toBeInTheDocument();
      expect(screen.getByText('latest-fake:Paper Eagle')).toBeInTheDocument();
    });

    expect(screen.getByText('recent:Paper Eagle|American Robin|Blue Jay')).toBeInTheDocument();
    expect(screen.getByText('view:/profile/birdlover/birdhouse')).toBeInTheDocument();
    expect(screen.getByText('real:/profile/birdlover/birdhouse?tab=real')).toBeInTheDocument();
    expect(screen.getByText('fake:/profile/birdlover/birdhouse?tab=fake')).toBeInTheDocument();
  });

  it('shows an error empty message when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
      }),
    );

    render(<PublicBirdhousePreviewCard username="birdlover" />);

    expect(await screen.findByText('empty:Unable to load this birdhouse preview right now.')).toBeInTheDocument();
  });
});
