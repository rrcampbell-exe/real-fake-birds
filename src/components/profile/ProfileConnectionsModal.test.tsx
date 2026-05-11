import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ProfileConnectionsModal from './ProfileConnectionsModal';

vi.mock('./SocialUserRow', () => ({
  default: ({
    entry,
    onRelationshipAction,
  }: {
    entry: {
      userId: string;
      username: string;
      relationship: string;
      capabilities: { canFollow: boolean; canUnfollow: boolean };
    };
    onRelationshipAction?: (entry: unknown) => void;
  }) => (
    <li>
      <span>{`${entry.username}:${entry.relationship}`}</span>
      <button type="button" onClick={() => onRelationshipAction?.(entry)}>
        act-{entry.username}
      </button>
    </li>
  ),
}));

describe('ProfileConnectionsModal', () => {
  it('returns nothing when closed', () => {
    const { container } = render(
      <ProfileConnectionsModal
        isOpen={false}
        username="birdlover"
        initialTab="followers"
        onClose={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('loads entries, allows relationship actions, and switches tabs', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entries: [
            {
              userId: 'user-1',
              username: 'follower-one',
              avatarPalette: 'finch',
              avatarFakeBirdImageUrl: null,
              isHouseAccount: false,
              latestBadgeName: null,
              relationship: 'none',
              capabilities: { canFollow: true, canUnfollow: false },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ relationship: 'following' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entries: [
            {
              userId: 'user-2',
              username: 'following-two',
              avatarPalette: 'finch',
              avatarFakeBirdImageUrl: null,
              isHouseAccount: false,
              latestBadgeName: null,
              relationship: 'following',
              capabilities: { canFollow: false, canUnfollow: true },
            },
          ],
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <ProfileConnectionsModal
        isOpen
        username="birdlover"
        initialTab="followers"
        followerCount={1200}
        followingCount={8}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText('follower-one:none')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'act-follower-one' }));
    expect(await screen.findByText('follower-one:following')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Following/i }));
    expect(await screen.findByText('following-two:following')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/profile/connections?username=birdlover&list=followers',
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/profile/connections?username=birdlover&list=following',
    );
  });

  it('shows an error state when loading fails and closes from backdrop clicks', async () => {
    const onClose = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
      }),
    );

    render(
      <ProfileConnectionsModal
        isOpen
        username="birdlover"
        initialTab="followers"
        onClose={onClose}
      />,
    );

    expect(await screen.findByText('Unable to load these connections right now.')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Unable to load these connections right now.').closest('[class*="fixed"]')!);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
