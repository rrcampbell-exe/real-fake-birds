import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TrophyCase from './TrophyCase';
import { finch } from '@/lib/themes';

vi.mock('@/components/account/AccountStateProvider', () => ({
  useAccountState: () => ({
    remoteSummary: {
      birdsIdentified: 0,
      seeds: 0,
      bestStreak: 0,
      bestDailyStreak: 0,
      bestWeeklyPlacement: null,
      firstPlaceCount: 0,
      secondPlaceCount: 0,
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

vi.mock('@/components/ShareButton', () => ({
  default: () => <button type="button">Share</button>,
}));

vi.mock('@/components/icons/MilestoneBadgeSvg', () => ({
  default: ({ milestoneValue }: { milestoneValue: number }) => <div>Badge {milestoneValue}</div>,
}));

import { useStoredJson } from '@/hooks/useStoredValue';

const mockedUseStoredJson = vi.mocked(useStoredJson);

describe('TrophyCase', () => {
  it('shows milestone threshold markers on both earned and locked trophies', () => {
    mockedUseStoredJson.mockImplementation((key) => {
      if (key === 'birdScore') {
        return {
          birdsSeen: 20,
          birdsIdentified: 12,
          currentStreak: 2,
          justAchievedStreak: false,
          bestStreak: 4,
          currentDailyStreak: 1,
          bestDailyStreak: 1,
          seeds: 3,
        };
      }

      if (key === 'birdTheme') {
        return finch;
      }

      return null;
    });

    render(<TrophyCase />);

    expect(screen.getByLabelText('10 birds to earn Downy Feather')).toBeInTheDocument();
    expect(screen.getByLabelText('25 birds to earn Contour Feather')).toBeInTheDocument();
    expect(screen.getByText('Badge 10')).toBeInTheDocument();
    expect(screen.getByText('Identify 25 birds to unlock this feather.')).toBeInTheDocument();
  });

  it('formats large milestone thresholds with separators', () => {
    mockedUseStoredJson.mockImplementation((key) => {
      if (key === 'birdScore') {
        return {
          birdsSeen: 2500,
          birdsIdentified: 2500,
          currentStreak: 12,
          justAchievedStreak: false,
          bestStreak: 12,
          currentDailyStreak: 3,
          bestDailyStreak: 3,
          seeds: 30,
        };
      }

      if (key === 'birdTheme') {
        return finch;
      }

      return null;
    });

    render(<TrophyCase />);

    expect(screen.getByLabelText('1,000 birds to earn Diamond Feather')).toBeInTheDocument();
  });
});