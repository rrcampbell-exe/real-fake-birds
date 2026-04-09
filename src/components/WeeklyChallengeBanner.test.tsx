import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WeeklyChallengeBanner from './WeeklyChallengeBanner';

vi.mock('@/components/account/AccountStateProvider', () => ({
  useAccountState: vi.fn(),
}));

vi.mock('@/hooks/useStoredValue', () => ({
  useStoredJson: vi.fn(),
}));

vi.mock('@/lib/utils/weekly-leaderboard', () => ({
  LEADERBOARD_LAST_SEEN_WEEK_STORAGE_KEY: 'leaderboardLastSeenWeek',
  markLeaderboardWeekSeen: vi.fn(),
}));

import { useAccountState } from '@/components/account/AccountStateProvider';
import { useStoredJson } from '@/hooks/useStoredValue';
import { markLeaderboardWeekSeen } from '@/lib/utils/weekly-leaderboard';

const weeklyOverview = {
  currentWeekStart: '2026-04-06',
  challenge: {
    id: 'seed-collector',
    name: 'Seed Collector',
    description: 'Gather more seeds this week than anyone else.',
    icon: 'sprout',
    primaryLabel: 'Seeds earned',
    tiebreakerLabel: 'Accuracy',
    metric: 'weeklySeedsEarned',
    tiebreakerMetric: 'accuracy',
  },
  previousRecap: null,
  placementSummary: {
    bestWeeklyPlacement: null,
    firstPlaceCount: 0,
    secondPlaceCount: 0,
    thirdPlaceCount: 0,
  },
};

describe('WeeklyChallengeBanner', () => {
  beforeEach(() => {
    vi.mocked(useAccountState).mockReset();
    vi.mocked(useStoredJson).mockReset();
    vi.mocked(markLeaderboardWeekSeen).mockReset();
  });

  it('renders nothing when the user cannot see the banner', () => {
    vi.mocked(useAccountState).mockReturnValue({
      accountUsername: null,
      weeklyOverview,
    } as ReturnType<typeof useAccountState>);
    vi.mocked(useStoredJson).mockReturnValue(null);

    const { container } = render(<WeeklyChallengeBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the challenge and dismisses it after the leaderboard link is clicked', () => {
    vi.mocked(useAccountState).mockReturnValue({
      accountUsername: 'birder',
      weeklyOverview,
    } as ReturnType<typeof useAccountState>);
    vi.mocked(useStoredJson).mockReturnValue(null);

    render(<WeeklyChallengeBanner />);

    expect(screen.getByText('Weekly Challenge')).toBeInTheDocument();
    expect(screen.getByText('Seed Collector')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'View Leaderboard' }));

    expect(markLeaderboardWeekSeen).toHaveBeenCalledWith('2026-04-06');
    expect(screen.queryByText('Weekly Challenge')).toBeNull();
  });

  it('renders nothing when the week was already seen', () => {
    vi.mocked(useAccountState).mockReturnValue({
      accountUsername: 'birder',
      weeklyOverview,
    } as ReturnType<typeof useAccountState>);
    vi.mocked(useStoredJson).mockReturnValue('2026-04-06');

    const { container } = render(<WeeklyChallengeBanner />);

    expect(container).toBeEmptyDOMElement();
  });
});
