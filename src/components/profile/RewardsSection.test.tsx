import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RewardsSection from './RewardsSection';
import { useStoredJson } from '@/hooks/useStoredValue';
import { buildStatsSharePayload } from '@/lib/utils/share-data';
import { setStoredBoolean } from '@/lib/utils/player-progress';

vi.mock('@/components/ShareButton', () => ({
  default: () => <div>ShareButton</div>,
}));

vi.mock('@/components/rewards/TrophyCase', () => ({
  default: () => <div>TrophyCase</div>,
}));

vi.mock('@/components/rewards/PersonalBests', () => ({
  default: ({ includeSummaryStats }: { includeSummaryStats?: boolean }) => <div>{includeSummaryStats ? 'PersonalBests:combined' : 'PersonalBests'}</div>,
}));

vi.mock('@/hooks/useStoredValue', () => ({
  useStoredJson: vi.fn(),
}));

vi.mock('@/lib/utils/share-data', () => ({
  buildStatsSharePayload: vi.fn(() => ({ title: 'share' })),
}));

vi.mock('@/lib/utils/player-progress', () => ({
  defaultBirdScore: {
    birdsSeen: 0,
    birdsIdentified: 0,
    bestStreak: 0,
    currentStreak: 0,
  },
  normalizeBirdScore: (value: unknown) => value,
  setStoredBoolean: vi.fn(),
  UNSEEN_BADGES_STORAGE_KEY: 'unseen-badges',
}));

describe('RewardsSection', () => {
  it('uses 0 accuracy when birdsSeen is 0', () => {
    vi.mocked(useStoredJson).mockReturnValue({
      birdsSeen: 0,
      birdsIdentified: 0,
      bestStreak: 5,
      currentStreak: 2,
    });

    render(<RewardsSection />);

    expect(setStoredBoolean).toHaveBeenCalledWith('unseen-badges', false);
    expect(buildStatsSharePayload).toHaveBeenCalledWith(expect.objectContaining({
      accuracy: 0,
      birdsIdentified: 0,
      bestStreak: 5,
      currentStreak: 2,
    }));
  });

  it('calculates floored accuracy when birdsSeen is positive', () => {
    vi.mocked(useStoredJson).mockReturnValue({
      birdsSeen: 9,
      birdsIdentified: 8,
      bestStreak: 7,
      currentStreak: 4,
    });

    render(<RewardsSection />);

    expect(buildStatsSharePayload).toHaveBeenCalledWith(expect.objectContaining({
      accuracy: 88,
      birdsIdentified: 8,
    }));
  });

  it('renders the combined stats grid variant', () => {
    vi.mocked(useStoredJson).mockReturnValue({
      birdsSeen: 9,
      birdsIdentified: 8,
      bestStreak: 7,
      currentStreak: 4,
    });

    const { getByText } = render(<RewardsSection />);

    expect(getByText('Stats')).toBeTruthy();
    expect(getByText('PersonalBests:combined')).toBeTruthy();
  });
});
