import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DailyChallengePage from './page';

vi.mock('@/hooks/useSessionMissions', () => ({
  useSessionMissions: vi.fn(),
}));

vi.mock('@/hooks/useStoredValue', () => ({
  useStoredJson: vi.fn(),
}));

vi.mock('@/components/game/MissionPanel', () => ({
  default: () => <div>MissionPanel</div>,
}));

import { useSessionMissions } from '@/hooks/useSessionMissions';
import { useStoredJson } from '@/hooks/useStoredValue';

const mockedUseSessionMissions = vi.mocked(useSessionMissions);
const mockedUseStoredJson = vi.mocked(useStoredJson);

describe('DailyChallengePage', () => {
  it('renders the mission hub copy and streak summary', () => {
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
        { id: 'warmup-rounds', missionId: 'warmup-rounds', description: 'Warmup', type: 'play_rounds', target: 3, rewardSeeds: 8, progress: 3, completed: true, claimed: true },
        { id: 'real-deal', missionId: 'real-deal', description: 'Real Deal', type: 'identify_real_birds', target: 2, rewardSeeds: 10, progress: 1, completed: false, claimed: false },
        { id: 'seed-harvest', missionId: 'seed-harvest', description: 'Seed Harvest', type: 'earn_seeds', target: 12, rewardSeeds: 12, progress: 4, completed: false, claimed: false },
      ],
      allCompleted: false,
      allClaimed: false,
      bonusClaimed: false,
      missionSetBonusSeeds: 15,
      claimMissionReward: vi.fn(),
      claimMissionSetBonus: vi.fn(),
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

  it('shows the clean sweep unlocked state once all missions are complete', () => {
    mockedUseSessionMissions.mockReturnValue({
      state: {
        date: '2026-04-05',
        missions: [
          { missionId: 'warmup-rounds', progress: 3, completed: true, claimed: true },
          { missionId: 'real-deal', progress: 2, completed: true, claimed: false },
          { missionId: 'seed-harvest', progress: 12, completed: true, claimed: false },
        ],
        bonusClaimed: false,
      },
      missions: [
        { id: 'warmup-rounds', missionId: 'warmup-rounds', description: 'Warmup', type: 'play_rounds', target: 3, rewardSeeds: 8, progress: 3, completed: true, claimed: true },
        { id: 'real-deal', missionId: 'real-deal', description: 'Real Deal', type: 'identify_real_birds', target: 2, rewardSeeds: 10, progress: 2, completed: true, claimed: false },
        { id: 'seed-harvest', missionId: 'seed-harvest', description: 'Seed Harvest', type: 'earn_seeds', target: 12, rewardSeeds: 12, progress: 12, completed: true, claimed: false },
      ],
      allCompleted: true,
      allClaimed: false,
      bonusClaimed: false,
      missionSetBonusSeeds: 15,
      claimMissionReward: vi.fn(),
      claimMissionSetBonus: vi.fn(),
    });
    mockedUseStoredJson.mockReturnValue([{ date: '2026-04-05' }]);

    render(<DailyChallengePage />);

    expect(screen.getByText('Clean sweep unlocked: 15 bonus seeds.')).toBeInTheDocument();
    expect(screen.getByText('The streak is already safe for today. Claim the sweep bonus whenever you want.')).toBeInTheDocument();
  });
});
