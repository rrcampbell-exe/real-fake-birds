import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MissionPanel from './MissionPanel';

vi.mock('@/hooks/useSessionMissions', () => ({
  useSessionMissions: vi.fn(),
}));

import { useSessionMissions } from '@/hooks/useSessionMissions';

describe('MissionPanel', () => {
  beforeEach(() => {
    vi.mocked(useSessionMissions).mockReset();
  });

  it('renders a loading skeleton when requested', () => {
    vi.mocked(useSessionMissions).mockReturnValue({
      state: { date: '2026-04-05', missions: [], bonusClaimed: false },
      missions: [],
      allCompleted: false,
      allClaimed: false,
      bonusClaimed: false,
      missionSetBonusSeeds: 15,
    } as ReturnType<typeof useSessionMissions>);

    const { container } = render(<MissionPanel isLoading />);

    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('renders nothing when there are no missions', () => {
    vi.mocked(useSessionMissions).mockReturnValue({
      state: { date: '2026-04-05', missions: [], bonusClaimed: false },
      missions: [],
      allCompleted: false,
      allClaimed: false,
      bonusClaimed: false,
      missionSetBonusSeeds: 15,
    } as ReturnType<typeof useSessionMissions>);

    const { container } = render(<MissionPanel />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders missions, progress, statuses, and the in-progress bonus state', () => {
    vi.mocked(useSessionMissions).mockReturnValue({
      missions: [
        {
          id: 'm1',
          description: 'Spot 2 birds',
          progress: 1,
          target: 2,
          rewardSeeds: 8,
          completed: false,
          claimed: false,
        },
        {
          id: 'm2',
          description: 'Use a hint',
          progress: 1,
          target: 1,
          rewardSeeds: 5,
          completed: true,
          claimed: false,
        },
      ],
      allCompleted: true,
      bonusClaimed: false,
      missionSetBonusSeeds: 15,
    } as ReturnType<typeof useSessionMissions>);

    render(<MissionPanel containerClassName="custom-panel" />);

    expect(screen.getByText('Daily Missions')).toBeInTheDocument();
    expect(screen.getByText('Spot 2 birds')).toBeInTheDocument();
    expect(screen.getByText('1/2 progress')).toBeInTheDocument();
    expect(screen.getByText('Keep going')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('+5 seeds')).toBeInTheDocument();
    expect(screen.getByText('High flyer bonus')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('renders the rewarded bonus state after all missions are claimed', () => {
    vi.mocked(useSessionMissions).mockReturnValue({
      missions: [
        {
          id: 'm1',
          description: 'Spot 2 birds',
          progress: 2,
          target: 2,
          rewardSeeds: 8,
          completed: true,
          claimed: true,
        },
      ],
      allCompleted: true,
      bonusClaimed: true,
      missionSetBonusSeeds: 15,
    } as ReturnType<typeof useSessionMissions>);

    render(<MissionPanel />);

    expect(screen.getByText('Rewarded')).toBeInTheDocument();
    expect(screen.getByText('You earned 15 bonus seeds for finishing all three missions.')).toBeInTheDocument();
    expect(screen.queryByText('In Progress')).toBeNull();
  });
});
