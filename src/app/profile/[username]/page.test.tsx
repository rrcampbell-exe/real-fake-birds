import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UserProfilePage from './page';

vi.mock('next/navigation', () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock('@/hooks/useScreenViewed', () => ({
  useScreenViewed: vi.fn(),
}));

vi.mock('@/components/profile/ProfileHeader', () => ({
  default: ({ username, joinedMonthYear, headerActions }: { username: string; joinedMonthYear: string; headerActions?: React.ReactNode }) => (
    <div>
      <h1>{username}</h1>
      <p>{joinedMonthYear}</p>
      {headerActions}
    </div>
  ),
}));

vi.mock('@/components/profile/ProfileConnectionsModal', () => ({
  default: () => <div data-testid="profile-connections-modal" />,
}));

vi.mock('@/components/profile/BirdhousePreviewCard', () => ({
  default: () => <div>BirdhousePreviewCard</div>,
}));

vi.mock('@/components/profile/PublicBirdhousePreviewCard', () => ({
  default: ({ username }: { username: string }) => <div>PublicBirdhousePreviewCard:{username}</div>,
}));

vi.mock('@/components/profile/ProgressSummary', () => ({
  default: () => <div>ProgressSummary</div>,
}));

vi.mock('@/components/rewards/TrophyCaseReadOnly', () => ({
  default: () => <div>TrophyCaseReadOnly</div>,
}));

import { useParams, useRouter } from 'next/navigation';

const PUBLIC_PROFILE_RESPONSE = {
  visibility: { reason: 'public_profile', canViewFull: true, canFollow: true },
  relationship: 'none',
  blockState: 'none',
  capabilities: { canFollow: true, canUnfollow: false, canChallengeBirdBlitz: true },
  profile: {
    kind: 'public',
    username: 'birdlover',
    avatarPalette: 'finch',
    avatarFakeBirdImageUrl: null,
    isHouseAccount: false,
    joinedMonthYear: 'April 2026',
    progress: {
      birdsIdentified: 42,
      seeds: 100,
      bestStreak: 7,
      bestDailyStreak: 5,
      bestWeeklyPlacement: 3,
      firstPlaceCount: 1,
      secondPlaceCount: 2,
      thirdPlaceCount: 3,
    },
    followerCount: 10,
    followingCount: 5,
  },
};

const VIEWER_BLOCKED_RESPONSE = {
  visibility: { reason: 'blocked', canViewFull: false, canFollow: false },
  relationship: 'blocked',
  blockState: 'viewer_blocked_target',
  capabilities: { canFollow: false, canUnfollow: false, canChallengeBirdBlitz: false },
  profile: {
    kind: 'blocked',
    username: 'birdlover',
    isHouseAccount: false,
    joinedMonthYear: 'April 2026',
  },
};

const OWNER_PROFILE_RESPONSE = {
  visibility: { reason: 'owner', canViewFull: true, canFollow: false },
  relationship: 'owner',
  blockState: 'none',
  capabilities: { canFollow: false, canUnfollow: false, canChallengeBirdBlitz: false },
  profile: {
    kind: 'own',
    username: 'birdlover',
    avatarPalette: 'finch',
    avatarFakeBirdImageUrl: null,
    isHouseAccount: false,
    joinedMonthYear: 'April 2026',
    privacyMode: 'public',
    progress: {
      birdsIdentified: 42,
      seeds: 100,
      bestStreak: 7,
      bestDailyStreak: 5,
      bestWeeklyPlacement: 3,
      firstPlaceCount: 1,
      secondPlaceCount: 2,
      thirdPlaceCount: 3,
    },
    followerCount: 10,
    followingCount: 5,
  },
};

describe('UserProfilePage', () => {
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.mocked(useParams).mockReturnValue({ username: 'birdlover' });
    vi.mocked(useRouter).mockReturnValue({ replace: mockReplace } as ReturnType<typeof useRouter>);
    mockReplace.mockReset();
    global.fetch = vi.fn();
  });

  it('renders the follow CTA alongside the safety actions menu for public profiles', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue(PUBLIC_PROFILE_RESPONSE),
    } as unknown as Response);

    render(<UserProfilePage />);

    expect(await screen.findByText('birdlover')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Follow' })).toBeInTheDocument();
    expect(screen.getByLabelText('Open profile safety actions')).toBeInTheDocument();
  });

  it('transitions into the blocked state after a successful block action', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(PUBLIC_PROFILE_RESPONSE),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ ok: true, relationship: 'blocked' }),
      } as unknown as Response);

    render(<UserProfilePage />);

    expect(await screen.findByText('birdlover')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Open profile safety actions'));
    fireEvent.click(screen.getByRole('menuitem', { name: /block player/i }));
    fireEvent.click(screen.getByRole('button', { name: /block player/i }));

    await waitFor(() => {
      expect(screen.getByText('This player is blocked.')).toBeInTheDocument();
    });
    expect(screen.queryByLabelText('Loading follower counts')).not.toBeInTheDocument();
  });

  it('renders the blocked profile card with an unblock path when the viewer already blocked the target', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue(VIEWER_BLOCKED_RESPONSE),
    } as unknown as Response);

    render(<UserProfilePage />);

    expect(await screen.findByText('This player is blocked.')).toBeInTheDocument();
    expect(screen.getByLabelText('Open profile safety actions')).toBeInTheDocument();
  });

  it('redirects owners to the personal profile page', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue(OWNER_PROFILE_RESPONSE),
    } as unknown as Response);

    render(<UserProfilePage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/profile');
    });
  });
});
