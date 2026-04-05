import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('shows and runs claim all for all available rewards', async () => {
    const claimMissionReward = vi.fn().mockResolvedValue(undefined);
    const claimMissionSetBonus = vi.fn().mockResolvedValue(undefined);

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
      state: {
        date: '2026-04-03',
        missions: [
          { missionId: 'warmup-rounds', progress: 3, completed: true, claimed: false },
          { missionId: 'real-deal', progress: 2, completed: true, claimed: false },
          { missionId: 'deep-focus', progress: 4, completed: true, claimed: false },
        ],
        bonusClaimed: false,
      },
      missions: [
        { id: 'warmup-rounds', missionId: 'warmup-rounds', description: 'Warmup', target: 3, rewardSeeds: 8, progress: 3, completed: true, claimed: false, type: 'play_rounds' },
        { id: 'real-deal', missionId: 'real-deal', description: 'Real Deal', target: 2, rewardSeeds: 10, progress: 2, completed: true, claimed: false, type: 'identify_real_birds' },
        { id: 'deep-focus', missionId: 'deep-focus', description: 'Deep Focus', target: 4, rewardSeeds: 20, progress: 4, completed: true, claimed: false, type: 'correct_without_hints' },
      ],
      allCompleted: true,
      allClaimed: false,
      bonusClaimed: false,
      missionSetBonusSeeds: 15,
      claimMissionReward,
      claimMissionSetBonus,
    });

    mockedGetUnclaimedDailyChallengeRewardSeeds.mockReturnValue(75);

    render(<RewardsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Claim All (5)' }));

    await waitFor(() => {
      expect(mockedClaimDailyChallengeBonuses).toHaveBeenCalled();
      expect(claimMissionReward).toHaveBeenCalledWith('warmup-rounds');
      expect(claimMissionReward).toHaveBeenCalledWith('real-deal');
      expect(claimMissionReward).toHaveBeenCalledWith('deep-focus');
      expect(claimMissionSetBonus).toHaveBeenCalled();
    });
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