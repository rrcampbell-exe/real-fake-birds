import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RewardsPage from './page';
import { finch } from '@/lib/themes';

vi.mock('@/hooks/useSessionMissions', () => ({
  useSessionMissions: vi.fn(),
}));

vi.mock('@/hooks/usePageProgressSync', () => ({
  usePageProgressSync: vi.fn(),
}));

vi.mock('@/components/rewards/TrophyCase', () => ({
  default: () => <div>TrophyCase</div>,
}));

vi.mock('@/components/rewards/PersonalBests', () => ({
  default: () => <div>PersonalBests</div>,
}));

vi.mock('@/components/account/AccountStateProvider', () => ({
  useAccountState: vi.fn(),
}));

vi.mock('@/hooks/useStoredValue', () => ({
  useStoredJson: vi.fn(),
}));

vi.mock('@/components/ShareButton', () => ({
  default: () => <button type="button">Share</button>,
}));

vi.mock('@/lib/utils/player-progress', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils/player-progress')>('@/lib/utils/player-progress');
  return {
    ...actual,
    setStoredBoolean: vi.fn(),
  };
});

vi.mock('@/components/game/MissionPanel', () => ({
  default: () => <div>MissionPanel</div>,
}));

import { useSessionMissions } from '@/hooks/useSessionMissions';
import { useAccountState } from '@/components/account/AccountStateProvider';
import { usePageProgressSync } from '@/hooks/usePageProgressSync';
import { useStoredJson } from '@/hooks/useStoredValue';

const mockedUseSessionMissions = vi.mocked(useSessionMissions);
const mockedUseAccountState = vi.mocked(useAccountState);
const mockedUsePageProgressSync = vi.mocked(usePageProgressSync);
const mockedUseStoredJson = vi.mocked(useStoredJson);

function mockRewardsState() {
  mockedUseAccountState.mockReturnValue({
    accountUsername: 'BirdFan',
    remoteSummary: {
      birdsIdentified: 10,
      seeds: 50,
      bestStreak: 4,
      bestDailyStreak: 2,
      bestWeeklyPlacement: 2,
      firstPlaceCount: 0,
      secondPlaceCount: 1,
      thirdPlaceCount: 0,
    },
  } as ReturnType<typeof useAccountState>);

  mockedUseStoredJson.mockImplementation((key) => {
    if (key === 'birdScore') {
      return {
        birdsSeen: 20,
        birdsIdentified: 10,
        currentStreak: 2,
        justAchievedStreak: false,
        bestStreak: 4,
        currentDailyStreak: 1,
        bestDailyStreak: 2,
        seeds: 50,
      };
    }

    if (key === 'birdTheme') {
      return finch;
    }

    return null;
  });
}

describe('RewardsPage', () => {
  it('shows automatic mission reward copy in the rewards tab', () => {
    mockRewardsState();
    mockedUsePageProgressSync.mockReturnValue({
      isPageSyncLoading: false,
      isPageBackgroundRefreshing: false,
      isSignedIn: true,
    });
    mockedUseSessionMissions.mockReturnValue({
      state: {
        date: '2026-04-03',
        missions: [
          { missionId: 'warmup-rounds', progress: 3, completed: true, claimed: false },
        ],
        bonusClaimed: true,
      },
      missions: [
        { id: 'warmup-rounds', missionId: 'warmup-rounds', description: 'Warmup', target: 3, rewardSeeds: 8, progress: 3, completed: true, claimed: false, type: 'play_rounds' },
      ],
      allCompleted: false,
      allClaimed: false,
      bonusClaimed: true,
      missionSetBonusSeeds: 15,
    });

    render(<RewardsPage />);

    expect(screen.getByText('Your bird-watching achievements.')).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
    expect(screen.queryByText('Classic Run Bonus')).not.toBeInTheDocument();
  });

  it('summarizes paid mission rewards from the rewards tab', () => {
    mockRewardsState();
    mockedUsePageProgressSync.mockReturnValue({
      isPageSyncLoading: false,
      isPageBackgroundRefreshing: false,
      isSignedIn: true,
    });
    mockedUseSessionMissions.mockReturnValue({
      state: {
        date: '2026-04-03',
        missions: [
          { missionId: 'warmup-rounds', progress: 3, completed: true, claimed: false },
        ],
        bonusClaimed: true,
      },
      missions: [
        { id: 'warmup-rounds', missionId: 'warmup-rounds', description: 'Warmup', target: 3, rewardSeeds: 8, progress: 3, completed: true, claimed: true, type: 'play_rounds' },
      ],
      allCompleted: false,
      allClaimed: true,
      bonusClaimed: true,
      missionSetBonusSeeds: 15,
    });

    render(<RewardsPage />);

    expect(screen.getByText(/you've completed 1 of 1 mission today, including the high flyer bonus/i)).toBeInTheDocument();
  });

  it('mentions the high flyer bonus when it has already been auto-awarded', () => {
    mockRewardsState();
    mockedUsePageProgressSync.mockReturnValue({
      isPageSyncLoading: false,
      isPageBackgroundRefreshing: false,
      isSignedIn: true,
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
      allClaimed: true,
      bonusClaimed: true,
      missionSetBonusSeeds: 15,
    });

    render(<RewardsPage />);

    expect(screen.getByText(/including the high flyer bonus/i)).toBeInTheDocument();
  });

  it('still shows the rewards page while background refresh is running', () => {
    mockRewardsState();
    mockedUsePageProgressSync.mockReturnValue({
      isPageSyncLoading: false,
      isPageBackgroundRefreshing: true,
      isSignedIn: true,
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
    });

    render(<RewardsPage />);

    expect(screen.getByText('Your bird-watching achievements.')).toBeInTheDocument();
    expect(screen.getByText('Polishing your trophy shelf...')).toBeInTheDocument();
  });
});