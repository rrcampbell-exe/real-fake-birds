import type { ImgHTMLAttributes } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SocialUserRow from './SocialUserRow';
import type { SocialUserEntry } from '@/types/social';

vi.mock('@/components/leaderboard/LeaderboardAvatar', () => ({
  default: ({ username }: { username: string }) => <div data-testid="avatar">{username}</div>,
}));

vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt ?? ''} />,
}));

function buildEntry(overrides?: Partial<SocialUserEntry>): SocialUserEntry {
  return {
    userId: 'user-1',
    username: 'birdlover',
    avatarPalette: 'finch',
    avatarFakeBirdImageUrl: null,
    isHouseAccount: false,
    latestBadgeName: null,
    relationship: 'none',
    capabilities: {
      canFollow: true,
      canUnfollow: false,
    },
    ...overrides,
  };
}

describe('SocialUserRow', () => {
  it('renders a follow action for unfollowed users', () => {
    render(<SocialUserRow entry={buildEntry()} />);

    expect(screen.getByRole('button', { name: 'Follow birdlover' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /See profile/i })).toHaveAttribute('href', '/profile/birdlover');
  });

  it('renders a disabled requested state', () => {
    render(
      <SocialUserRow
        entry={buildEntry({
          relationship: 'requested',
          capabilities: { canFollow: false, canUnfollow: false },
        })}
      />,
    );

    expect(screen.getByRole('button', { name: 'Requested birdlover' })).toBeDisabled();
  });

  it('renders an unfollow action and hides the profile button on mobile when requested', () => {
    render(
      <SocialUserRow
        entry={buildEntry({
          relationship: 'following',
          capabilities: { canFollow: false, canUnfollow: true },
        })}
        hideProfileButtonOnMobile
      />,
    );

    expect(screen.getByRole('button', { name: 'Unfollow birdlover' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /See profile/i })).toHaveClass('hidden', 'sm:inline-flex');
  });
});
