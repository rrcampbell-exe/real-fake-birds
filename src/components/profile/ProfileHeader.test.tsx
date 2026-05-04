import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProfileHeader from './ProfileHeader';

vi.mock('@/components/leaderboard/LeaderboardAvatar', () => ({
  default: ({ username }: { username: string }) => <div data-testid="avatar">{username}</div>,
}));

vi.mock('@/components/profile/FollowerSummary', () => ({
  default: () => <div data-testid="follower-summary">followers</div>,
}));

describe('ProfileHeader', () => {
  it('shows private pill and follower summary for owner in private mode', () => {
    render(
      <ProfileHeader
        username="catbird"
        avatarPalette="finch"
        joinedMonthYear="May 2026"
        privacyMode="private"
        isOwner
      />
    );

    expect(screen.getByRole('heading', { name: 'catbird' })).toBeInTheDocument();
    expect(screen.getByLabelText('Change privacy setting in Settings')).toHaveTextContent('Private');
    expect(screen.getByTestId('follower-summary')).toBeInTheDocument();
  });

  it('hides privacy controls and follower summary for non-owner private profile', () => {
    render(
      <ProfileHeader
        username="night_heron"
        avatarPalette="finch"
        joinedMonthYear="May 2026"
        privacyMode="private"
      />
    );

    expect(screen.queryByLabelText('Change privacy setting in Settings')).not.toBeInTheDocument();
    expect(screen.queryByTestId('follower-summary')).not.toBeInTheDocument();
  });

  it('shows public pill and follower summary for owner in public mode', () => {
    render(
      <ProfileHeader
        username="robin"
        avatarPalette="finch"
        joinedMonthYear="May 2026"
        privacyMode="public"
        isOwner
      />
    );

    expect(screen.getByLabelText('Change privacy setting in Settings')).toHaveTextContent('Public');
    expect(screen.getByTestId('follower-summary')).toBeInTheDocument();
    expect(screen.getByText('Joined May 2026')).toBeInTheDocument();
  });
});
