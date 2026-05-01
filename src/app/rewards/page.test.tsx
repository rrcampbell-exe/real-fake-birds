import { render, screen } from '@testing-library/react';
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
  it('shows automatic mission reward copy in the rewards tab', () => {
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
        { id: 'warmup-rounds', missionId: 'warmup-rounds', description: 'Warmup', toastDescription: 'You warmed up.', target: 3, rewardSeeds: 8, progress: 3, completed: true, claimed: false, type: 'play_rounds' },
      ],
      allCompleted: false,
      allClaimed: false,
      bonusClaimed: true,
      missionSetBonusSeeds: 15,
    });

    render(<RewardsPage />);

    expect(screen.getByText('Your bird-watching achievements.')).toBeInTheDocument();
    expect(screen.queryByText('Classic Run Bonus')).not.toBeInTheDocument();
  });

  it('still shows the rewards page while background refresh is running', () => {
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