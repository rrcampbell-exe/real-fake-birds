import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RewardsPage from './page';

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
import { usePageProgressSync } from '@/hooks/usePageProgressSync';

const mockedUseSessionMissions = vi.mocked(useSessionMissions);
const mockedUsePageProgressSync = vi.mocked(usePageProgressSync);

describe('RewardsPage', () => {
  it('shows claimable mission rewards in the rewards tab', () => {
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
      claimMissionReward: vi.fn(),
      claimMissionSetBonus: vi.fn(),
    });

    render(<RewardsPage />);

    expect(screen.getByText('Your bird-watching achievements and claimable bonuses.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Claim All (1)' })).toBeInTheDocument();
    expect(screen.queryByText('Classic Run Bonus')).not.toBeInTheDocument();
  });

  it('claims mission rewards from the rewards tab', async () => {
    mockedUsePageProgressSync.mockReturnValue({
      isPageSyncLoading: false,
      isPageBackgroundRefreshing: false,
      isSignedIn: true,
    });
    const claimMissionReward = vi.fn().mockResolvedValue(undefined);
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
      claimMissionReward,
      claimMissionSetBonus: vi.fn(),
    });

    render(<RewardsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Claim All (1)' }));

    await waitFor(() => {
      expect(claimMissionReward).toHaveBeenCalledWith('warmup-rounds');
    });
  });

  it('shows and runs claim all for all available rewards', async () => {
    mockedUsePageProgressSync.mockReturnValue({
      isPageSyncLoading: false,
      isPageBackgroundRefreshing: false,
      isSignedIn: true,
    });
    const claimMissionReward = vi.fn().mockResolvedValue(undefined);
    const claimMissionSetBonus = vi.fn().mockResolvedValue(undefined);

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

    render(<RewardsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Claim All (4)' }));

    await waitFor(() => {
      expect(claimMissionReward).toHaveBeenCalledWith('warmup-rounds');
      expect(claimMissionReward).toHaveBeenCalledWith('real-deal');
      expect(claimMissionReward).toHaveBeenCalledWith('deep-focus');
      expect(claimMissionSetBonus).toHaveBeenCalled();
    });
  });

  it('shows no claims waiting when nothing is pending', () => {
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
      claimMissionReward: vi.fn(),
      claimMissionSetBonus: vi.fn(),
    });

    render(<RewardsPage />);

    expect(screen.getByText('Your bird-watching achievements and claimable bonuses.')).toBeInTheDocument();
    expect(screen.getByText('Polishing your trophy shelf...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nothing to claim' })).toBeInTheDocument();
  });
});