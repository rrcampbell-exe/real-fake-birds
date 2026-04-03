import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RewardsPage from './page';

vi.mock('@/hooks/useDailyChallengeState', () => ({
  useDailyChallengeState: vi.fn(),
}));

vi.mock('@/hooks/useSessionMissions', () => ({
  useSessionMissions: vi.fn(),
}));

vi.mock('@/hooks/useSound', () => ({
  useSound: () => ({ play: vi.fn() }),
}));

vi.mock('@/components/rewards/TrophyCase', () => ({
  default: () => <div>TrophyCase</div>,
}));

vi.mock('@/components/rewards/PersonalBests', () => ({
  default: () => <div>PersonalBests</div>,
}));

vi.mock('@/lib/utils/player-progress', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils/player-progress')>('@/lib/utils/player-progress');
  return {
    ...actual,
    setStoredBoolean: vi.fn(),
  };
});

vi.mock('@/lib/utils/daily-challenge', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils/daily-challenge')>('@/lib/utils/daily-challenge');
  return {
    ...actual,
    claimDailyChallengeBonuses: vi.fn(),
    getUnclaimedDailyChallengeRewardSeeds: vi.fn(),
  };
});

vi.mock('@/components/game/MissionPanel', () => ({
  default: () => <div>MissionPanel</div>,
}));

import { useDailyChallengeState } from '@/hooks/useDailyChallengeState';
import { useSessionMissions } from '@/hooks/useSessionMissions';
import { claimDailyChallengeBonuses, getUnclaimedDailyChallengeRewardSeeds } from '@/lib/utils/daily-challenge';

const mockedUseDailyChallengeState = vi.mocked(useDailyChallengeState);
const mockedUseSessionMissions = vi.mocked(useSessionMissions);
const mockedClaimDailyChallengeBonuses = vi.mocked(claimDailyChallengeBonuses);
const mockedGetUnclaimedDailyChallengeRewardSeeds = vi.mocked(getUnclaimedDailyChallengeRewardSeeds);

describe('RewardsPage', () => {
  it('shows claimable daily rewards in the rewards tab', () => {
    mockedUseDailyChallengeState.mockReturnValue({
      state: {
        date: '2026-04-03',
        roundsPlayed: 5,
        correctAnswers: 4,
        completed: true,
        completionBonusAwarded: false,
        perfectBonusAwarded: false,
        bonusSeedsAwarded: 25,
        roundResults: [true, true, true, true, false],
      },
      history: [],
      challengeStreak: 2,
      roundsRemaining: 0,
      isComplete: true,
      canPlay: false,
      recordRound: vi.fn(),
    });

    mockedUseSessionMissions.mockReturnValue({
      state: { date: '2026-04-03', missions: [], bonusClaimed: false },
      missions: [],
      allCompleted: false,
      allClaimed: false,
      bonusClaimed: false,
      missionSetBonusSeeds: 15,
      claimMissionReward: vi.fn(),
      claimMissionSetBonus: vi.fn(),
    });

    mockedGetUnclaimedDailyChallengeRewardSeeds.mockReturnValue(25);

    render(<RewardsPage />);

    expect(screen.getByText('Claim your challenge payout')).toBeInTheDocument();
    expect(screen.getByText('Your bird-watching achievements and claimable bonuses.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Claim Daily Reward' })).toBeInTheDocument();
  });

  it('claims the daily reward from the rewards tab', () => {
    mockedUseDailyChallengeState.mockReturnValue({
      state: {
        date: '2026-04-03',
        roundsPlayed: 5,
        correctAnswers: 5,
        completed: true,
        completionBonusAwarded: false,
        perfectBonusAwarded: false,
        bonusSeedsAwarded: 75,
        roundResults: [true, true, true, true, true],
      },
      history: [],
      challengeStreak: 3,
      roundsRemaining: 0,
      isComplete: true,
      canPlay: false,
      recordRound: vi.fn(),
    });

    mockedUseSessionMissions.mockReturnValue({
      state: { date: '2026-04-03', missions: [], bonusClaimed: false },
      missions: [],
      allCompleted: false,
      allClaimed: false,
      bonusClaimed: false,
      missionSetBonusSeeds: 15,
      claimMissionReward: vi.fn(),
      claimMissionSetBonus: vi.fn(),
    });

    mockedGetUnclaimedDailyChallengeRewardSeeds.mockReturnValue(75);

    render(<RewardsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Claim Daily Reward' }));

    expect(mockedClaimDailyChallengeBonuses).toHaveBeenCalled();
  });

  it('shows no claims waiting when nothing is pending', () => {
    mockedUseDailyChallengeState.mockReturnValue({
      state: {
        date: '2026-04-03',
        roundsPlayed: 5,
        correctAnswers: 4,
        completed: true,
        completionBonusAwarded: true,
        perfectBonusAwarded: false,
        bonusSeedsAwarded: 25,
        roundResults: [true, true, true, true, false],
      },
      history: [],
      challengeStreak: 2,
      roundsRemaining: 0,
      isComplete: true,
      canPlay: false,
      recordRound: vi.fn(),
    });

    mockedUseSessionMissions.mockReturnValue({
      state: {
        date: '2026-04-03',
        missions: [
          {
            missionId: 'warmup-rounds',
            progress: 3,
            completed: true,
            claimed: true,
          },
        ],
        bonusClaimed: true,
      },
      missions: [],
      allCompleted: true,
      allClaimed: true,
      bonusClaimed: true,
      missionSetBonusSeeds: 15,
      claimMissionReward: vi.fn(),
      claimMissionSetBonus: vi.fn(),
    });

    mockedGetUnclaimedDailyChallengeRewardSeeds.mockReturnValue(0);

    render(<RewardsPage />);

    expect(screen.getByText('Your bird-watching achievements and claimable bonuses.')).toBeInTheDocument();
  });
});