import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import FollowersModal from './FollowersModal';

vi.mock('next/link', () => ({
  default: ({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) => (
    <a href={href} onClick={onClick}>{children}</a>
  ),
}));

vi.mock('@/components/leaderboard/LeaderboardAvatar', () => ({
  default: ({ username }: { username: string }) => <div data-testid={`avatar-${username}`} />,
}));

const mockFollowersData = {
  followers: [
    {
      userId: 'u1',
      username: 'alice',
      avatarPalette: 'finch',
      avatarFakeBirdImageUrl: null,
      isHouseAccount: false,
      latestBadgeName: null,
      relationship: 'none',
      capabilities: { canFollow: true, canUnfollow: false },
    },
  ],
  following: [
    {
      userId: 'u2',
      username: 'bob',
      avatarPalette: 'finch',
      avatarFakeBirdImageUrl: null,
      isHouseAccount: false,
      latestBadgeName: null,
      relationship: 'following',
      capabilities: { canFollow: false, canUnfollow: true },
    },
  ],
  pendingRequests: [],
};

function mockFetchSuccess(data = mockFollowersData) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => data,
  } as Response);
}

function mockFetchError() {
  global.fetch = vi.fn().mockResolvedValue({ ok: false } as Response);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('FollowersModal', () => {
  it('renders nothing when not open', () => {
    render(<FollowersModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows loading skeletons while fetching', async () => {
    global.fetch = vi.fn(() => new Promise(() => {}));
    render(<FollowersModal isOpen onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Loading state shows skeleton elements (no list items)
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('shows follower list after successful fetch', async () => {
    mockFetchSuccess();
    render(<FollowersModal isOpen initialTab="followers" onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('alice')).toBeInTheDocument());
    expect(screen.getByText('Followers (1)')).toBeInTheDocument();
    expect(screen.getByText('Following (1)')).toBeInTheDocument();
  });

  it('shows following list on following tab', async () => {
    mockFetchSuccess();
    render(<FollowersModal isOpen initialTab="following" onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('bob')).toBeInTheDocument());
  });

  it('shows error message on fetch failure', async () => {
    mockFetchError();
    render(<FollowersModal isOpen onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Unable to load followers.')).toBeInTheDocument());
  });

  it('shows empty state for followers tab', async () => {
    mockFetchSuccess({ followers: [], following: [], pendingRequests: [] });
    render(<FollowersModal isOpen initialTab="followers" onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('No followers yet.')).toBeInTheDocument());
  });

  it('shows empty state for following tab', async () => {
    mockFetchSuccess({ followers: [], following: [], pendingRequests: [] });
    render(<FollowersModal isOpen initialTab="following" onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Not following anyone yet.')).toBeInTheDocument());
  });

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    mockFetchSuccess();
    const onClose = vi.fn();
    render(<FollowersModal isOpen onClose={onClose} />);
    await waitFor(() => screen.getByRole('dialog'));
    // Click the backdrop (first div behind modal)
    const backdrop = document.querySelector('.absolute.inset-0.bg-black\\/70') as HTMLElement;
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    mockFetchSuccess();
    const onClose = vi.fn();
    render(<FollowersModal isOpen onClose={onClose} />);
    await waitFor(() => screen.getByRole('dialog'));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('switches tab when Following button is clicked', async () => {
    const user = userEvent.setup();
    mockFetchSuccess();
    render(<FollowersModal isOpen initialTab="followers" onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('alice')).toBeInTheDocument());
    await user.click(screen.getByText(/^Following/));
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  it('shows unfollow button in following tab and calls API on click', async () => {
    const user = userEvent.setup();
    mockFetchSuccess();
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockFollowersData } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);
    const onUnfollowed = vi.fn();
    render(
      <FollowersModal isOpen initialTab="following" isOwner onClose={vi.fn()} onUnfollowed={onUnfollowed} />
    );
    await waitFor(() => expect(screen.getByText('bob')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /unfollow/i }));
    await waitFor(() => expect(onUnfollowed).toHaveBeenCalledWith('u2'));
    expect(screen.queryByText('bob')).not.toBeInTheDocument();
  });

  it('does not remove user from list if unfollow API call fails', async () => {
    const user = userEvent.setup();
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockFollowersData } as Response)
      .mockResolvedValueOnce({ ok: false } as Response);
    render(<FollowersModal isOpen initialTab="following" isOwner onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('bob')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /unfollow/i }));
    await waitFor(() => expect(screen.getByText('bob')).toBeInTheDocument());
  });
});
