import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PersonalBests from './PersonalBests';

vi.mock('@/components/account/AccountStateProvider', () => ({
  useAccountState: () => ({
    remoteSummary: {
      birdsIdentified: 0,
      seeds: 0,
      bestStreak: 0,
      bestDailyStreak: 0,
      bestWeeklyPlacement: 2,
      firstPlaceCount: 0,
      secondPlaceCount: 1,
      thirdPlaceCount: 0,
    },
  }),
}));

vi.mock('@/hooks/useStoredValue', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useStoredValue')>('@/hooks/useStoredValue');
  return {
    ...actual,
    useStoredJson: vi.fn(),
  };
});

import { useStoredJson } from '@/hooks/useStoredValue';

const mockedUseStoredJson = vi.mocked(useStoredJson);

describe('PersonalBests', () => {
  it('shows separate guess and daily streak cards with clear labels', () => {
    mockedUseStoredJson
      .mockReturnValueOnce({
        birdsSeen: 20,
        birdsIdentified: 14,
        currentStreak: 3,
        justAchievedStreak: false,
        bestStreak: 7,
        currentDailyStreak: 1,
        bestDailyStreak: 2,
        seeds: 15,
      })
      .mockReturnValueOnce([
        { date: '2026-04-03' },
        { date: '2026-04-02' },
        { date: '2026-03-31' },
      ]);

    render(<PersonalBests />);

    expect(screen.getByText('Best Guess Streak')).toBeInTheDocument();
    expect(screen.getByText('Current Guess Streak')).toBeInTheDocument();
    expect(screen.getByText('Best Daily Streak')).toBeInTheDocument();
    expect(screen.getByText('Current Daily Streak')).toBeInTheDocument();
    expect(screen.getByText('Best Weekly Finish')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });
});