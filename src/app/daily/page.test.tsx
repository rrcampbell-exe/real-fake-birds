import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DailyChallengePage from './page';

const markDailyMissionDateSeenMock = vi.fn();

vi.mock('@/hooks/useSessionMissions', () => ({
  useSessionMissions: vi.fn(),
}));

vi.mock('@/hooks/useStoredValue', () => ({
  useStoredJson: vi.fn(),
}));

vi.mock('@/hooks/usePageProgressSync', () => ({
  usePageProgressSync: vi.fn(),
}));

vi.mock('@/lib/utils/daily-mission-notification', () => ({
  markDailyMissionDateSeen: (...args: unknown[]) => markDailyMissionDateSeenMock(...args),
}));

vi.mock('@/components/game/MissionPanel', () => ({
  default: () => <div>MissionPanel</div>,
}));

import { useSessionMissions } from '@/hooks/useSessionMissions';
import { useStoredJson } from '@/hooks/useStoredValue';
import { usePageProgressSync } from '@/hooks/usePageProgressSync';

const mockedUseSessionMissions = vi.mocked(useSessionMissions);
const mockedUseStoredJson = vi.mocked(useStoredJson);
const mockedUsePageProgressSync = vi.mocked(usePageProgressSync);

describe('DailyChallengePage', () => {
  it('marks today\'s daily missions as seen on render', () => {
    markDailyMissionDateSeenMock.mockReset();
    mockedUsePageProgressSync.mockReturnValue({
      isPageSyncLoading: false,
      isPageBackgroundRefreshing: false,
      isSignedIn: true,
    });
    mockedUseSessionMissions.mockReturnValue({
      state: { date: '2026-04-05', missions: [], bonusClaimed: false },
      missions: [],
      allCompleted: false,
      allClaimed: false,
      bonusClaimed: false,
      missionSetBonusSeeds: 15,
    });
    mockedUseStoredJson.mockReturnValue([]);

    render(<DailyChallengePage />);

    expect(markDailyMissionDateSeenMock).toHaveBeenCalledWith('2026-04-05');
  });

  it('shows a background refresh badge while signed-in progress is syncing', () => {
    markDailyMissionDateSeenMock.mockReset();
    mockedUsePageProgressSync.mockReturnValue({
      isPageSyncLoading: false,
      isPageBackgroundRefreshing: true,
      isSignedIn: true,
    });
    mockedUseSessionMissions.mockReturnValue({
      state: { date: '2026-04-05', missions: [], bonusClaimed: false },
      missions: [],
      allCompleted: false,
      allClaimed: false,
      bonusClaimed: false,
      missionSetBonusSeeds: 15,
    });
    mockedUseStoredJson.mockReturnValue([]);

    render(<DailyChallengePage />);

    expect(screen.getByText('Checking today\'s flock tasks...')).toBeInTheDocument();
    expect(screen.getByText('MissionPanel')).toBeInTheDocument();
  });

  it('renders the mission hub copy and streak summary', () => {
    markDailyMissionDateSeenMock.mockReset();
    mockedUsePageProgressSync.mockReturnValue({
      isPageSyncLoading: false,
      isPageBackgroundRefreshing: false,
      isSignedIn: true,
    });
    mockedUseSessionMissions.mockReturnValue({
      state: {
        date: '2026-04-05',
        missions: [
          { missionId: 'warmup-rounds', progress: 3, completed: true, claimed: true },
          { missionId: 'real-deal', progress: 1, completed: false, claimed: false },
          { missionId: 'seed-harvest', progress: 4, completed: false, claimed: false },
        ],
        bonusClaimed: false,
      },
      missions: [
        { id: 'warmup-rounds', missionId: 'warmup-rounds', description: 'Warmup', toastDescription: 'Warm up with three rounds.', type: 'play_rounds', target: 3, rewardSeeds: 8, progress: 3, completed: true, claimed: true },
        { id: 'real-deal', missionId: 'real-deal', description: 'Real Deal', toastDescription: 'Identify two real birds.', type: 'identify_real_birds', target: 2, rewardSeeds: 10, progress: 1, completed: false, claimed: false },
        { id: 'seed-harvest', missionId: 'seed-harvest', description: 'Seed Harvest', toastDescription: 'Earn a dozen seeds.', type: 'earn_seeds', target: 12, rewardSeeds: 12, progress: 4, completed: false, claimed: false },
      ],
      allCompleted: false,
      allClaimed: false,
      bonusClaimed: false,
      missionSetBonusSeeds: 15,
    });
    mockedUseStoredJson.mockReturnValue([
      { date: '2026-04-05' },
      { date: '2026-04-04' },
      { date: '2026-04-03' },
    ]);

    render(<DailyChallengePage />);

    expect(screen.getByText('Daily Missions')).toBeInTheDocument();
    expect(screen.getByText('Keep the streak alive by finishing all three missions.')).toBeInTheDocument();
    expect(screen.getByText('Current Streak')).toBeInTheDocument();
    expect(screen.getByText('1/3')).toBeInTheDocument();
    expect(screen.getByText('MissionPanel')).toBeInTheDocument();
  });

  it('shows the high flyer unlocked state once all missions are complete', () => {
    markDailyMissionDateSeenMock.mockReset();
    mockedUsePageProgressSync.mockReturnValue({
      isPageSyncLoading: false,
      isPageBackgroundRefreshing: false,
      isSignedIn: true,
    });
    mockedUseSessionMissions.mockReturnValue({
      state: {
        date: '2026-04-05',
        missions: [
          { missionId: 'warmup-rounds', progress: 3, completed: true, claimed: true },
          { missionId: 'real-deal', progress: 2, completed: true, claimed: true },
          { missionId: 'seed-harvest', progress: 12, completed: true, claimed: true },
        ],
        bonusClaimed: true,
      },
      missions: [
        { id: 'warmup-rounds', missionId: 'warmup-rounds', description: 'Warmup', toastDescription: 'Warm up with three rounds.', type: 'play_rounds', target: 3, rewardSeeds: 8, progress: 3, completed: true, claimed: true },
        { id: 'real-deal', missionId: 'real-deal', description: 'Real Deal', toastDescription: 'Identify two real birds.', type: 'identify_real_birds', target: 2, rewardSeeds: 10, progress: 2, completed: true, claimed: true },
        { id: 'seed-harvest', missionId: 'seed-harvest', description: 'Seed Harvest', toastDescription: 'Earn a dozen seeds.', type: 'earn_seeds', target: 12, rewardSeeds: 12, progress: 12, completed: true, claimed: true },
      ],
      allCompleted: true,
      allClaimed: false,
      bonusClaimed: true,
      missionSetBonusSeeds: 15,
    });
    mockedUseStoredJson.mockReturnValue([{ date: '2026-04-05' }]);

    render(<DailyChallengePage />);

    expect(screen.getByText('Rewards Paid')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Today\'s mission rewards have already been awarded.')).toBeInTheDocument();
  });
});
