import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DailyChallengeCard from './DailyChallengeCard';

vi.mock('@/hooks/useDailyChallengeState', () => ({
  useDailyChallengeState: vi.fn(),
}));

import { useDailyChallengeState } from '@/hooks/useDailyChallengeState';

describe('DailyChallengeCard', () => {
  beforeEach(() => {
    vi.mocked(useDailyChallengeState).mockReset();
  });

  it('renders the active daily challenge state', () => {
    vi.mocked(useDailyChallengeState).mockReturnValue({
      state: { correctAnswers: 2 },
      challengeStreak: 4,
      roundsRemaining: 3,
      isComplete: false,
    } as ReturnType<typeof useDailyChallengeState>);

    render(<DailyChallengeCard />);

    expect(screen.getByText('One fresh flock per day')).toBeInTheDocument();
    expect(screen.getByText('2/5')).toBeInTheDocument();
    expect(screen.getByText('4 day streak')).toBeInTheDocument();
    expect(screen.getByText('3 rounds waiting')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Play daily' })).toBeInTheDocument();
  });

  it('renders the completed state and can hide the action link', () => {
    vi.mocked(useDailyChallengeState).mockReturnValue({
      state: { correctAnswers: 5 },
      challengeStreak: 7,
      roundsRemaining: 0,
      isComplete: true,
    } as ReturnType<typeof useDailyChallengeState>);

    render(<DailyChallengeCard showAction={false} />);

    expect(screen.getByText('Come back tomorrow')).toBeInTheDocument();
    expect(screen.getByText("You finished today's 5-round challenge with 5 correct.")).toBeInTheDocument();
    expect(screen.getByText('Locked until tomorrow')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'View summary' })).toBeNull();
  });
});
