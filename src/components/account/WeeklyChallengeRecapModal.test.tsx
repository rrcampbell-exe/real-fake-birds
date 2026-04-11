import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WeeklyChallengeRecapModal from './WeeklyChallengeRecapModal';

vi.mock('@/components/account/AccountStateProvider', () => ({
  useAccountState: vi.fn(),
}));

vi.mock('@/hooks/useStoredValue', () => ({
  useStoredJson: vi.fn(),
}));

vi.mock('@/lib/utils/weekly-leaderboard', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils/weekly-leaderboard')>('@/lib/utils/weekly-leaderboard');
  return {
    ...actual,
    markWeeklyRecapWeekSeen: vi.fn(),
  };
});

import { useAccountState } from '@/components/account/AccountStateProvider';
import { useStoredJson } from '@/hooks/useStoredValue';
import { markWeeklyRecapWeekSeen } from '@/lib/utils/weekly-leaderboard';

const mockedUseAccountState = vi.mocked(useAccountState);
const mockedUseStoredJson = vi.mocked(useStoredJson);
const mockedMarkWeeklyRecapWeekSeen = vi.mocked(markWeeklyRecapWeekSeen);

function createWeeklyOverview(overrides: Record<string, unknown> = {}) {
  return {
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
    previousRecap: {
      weekStart: '2026-03-30',
      participated: true,
      qualified: true,
      rank: 7,
      rewardSeeds: 100,
      ...(overrides.previousRecap as object | undefined),
    },
    placementSummary: {
      bestWeeklyPlacement: 7,
      firstPlaceCount: 0,
      secondPlaceCount: 0,
      thirdPlaceCount: 0,
    },
  };
}

describe('WeeklyChallengeRecapModal', () => {
  beforeEach(() => {
    mockedUseAccountState.mockReset();
    mockedUseStoredJson.mockReset();
    mockedMarkWeeklyRecapWeekSeen.mockReset();
  });

  it('renders a top-10 recap for an unseen previous week and marks it seen on close', () => {
    mockedUseAccountState.mockReturnValue({
      isBooting: false,
      isSignedIn: true,
      weeklyOverview: createWeeklyOverview(),
    } as ReturnType<typeof useAccountState>);
    mockedUseStoredJson.mockReturnValue(null);

    render(<WeeklyChallengeRecapModal />);

    expect(screen.getByText('Weekly Challenge Recap')).toBeInTheDocument();
    expect(screen.getByText('Top 10 Finish!')).toBeInTheDocument();
    expect(screen.getByText(/You finished #7 last week\. You earned \+100 seeds\./i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(mockedMarkWeeklyRecapWeekSeen).toHaveBeenCalledWith('2026-03-30');
    expect(screen.queryByText('Weekly Challenge Recap')).not.toBeInTheDocument();
  });

  it('renders a missed-week encouragement state', () => {
    mockedUseAccountState.mockReturnValue({
      isBooting: false,
      isSignedIn: true,
      weeklyOverview: createWeeklyOverview({
        previousRecap: {
          weekStart: '2026-03-30',
          participated: false,
          qualified: false,
          rank: null,
          rewardSeeds: 0,
        },
      }),
    } as ReturnType<typeof useAccountState>);
    mockedUseStoredJson.mockReturnValue(null);

    render(<WeeklyChallengeRecapModal />);

    expect(screen.getByText('Last Week Flew By')).toBeInTheDocument();
    expect(screen.getByText(/You missed last week's challenge, but the Seed Collector challenge is live now\./i)).toBeInTheDocument();
  });

  it('does not render once that recap week has already been seen', () => {
    mockedUseAccountState.mockReturnValue({
      isBooting: false,
      isSignedIn: true,
      weeklyOverview: createWeeklyOverview(),
    } as ReturnType<typeof useAccountState>);
    mockedUseStoredJson.mockReturnValue('2026-03-30');

    const { container } = render(<WeeklyChallengeRecapModal />);

    expect(container).toBeEmptyDOMElement();
  });
});