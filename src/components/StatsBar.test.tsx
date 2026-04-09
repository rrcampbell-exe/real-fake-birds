import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}));

vi.mock('@/lib/supabase/env', () => ({
  hasSupabaseEnv: vi.fn(() => false),
}));

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } }),
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      })),
    },
  })),
}));

vi.mock('@/lib/auth/account-session', () => ({
  flushQueuedProgressEventsForSignedInUser: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/auth/account-sync', () => ({
  purchaseStreakInsuranceDirect: vi.fn(),
}));

import StatsBar from './StatsBar';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { purchaseStreakInsuranceDirect } from '@/lib/auth/account-sync';
import type { GameRoundResult } from '@/types';
import { notifyStoredValueChanged } from '@/hooks/useStoredValue';

const mockedHasSupabaseEnv = vi.mocked(hasSupabaseEnv);
const mockedPurchaseStreakInsuranceDirect = vi.mocked(purchaseStreakInsuranceDirect);

function expectStatValue(label: string, value: string) {
  const labelNode = screen.getByText(label);
  expect(labelNode.previousElementSibling).toHaveTextContent(value);
}

describe('StatsBar', () => {
  beforeEach(() => {
    mockedHasSupabaseEnv.mockReturnValue(false);
    mockedPurchaseStreakInsuranceDirect.mockReset();
    vi.useRealTimers();
  });

  it('renders nothing when no bird score exists', () => {
    const { container } = render(<StatsBar />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders stats from localStorage', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 10,
        birdsIdentified: 7,
        currentStreak: 4,
        bestStreak: 9,
        seeds: 12,
      })
    );

    render(<StatsBar refreshTrigger={0} />);

    expect(screen.getByText('4')).toBeInTheDocument();
    expectStatValue('acc', '70%');
    expectStatValue('best', '9');
    expectStatValue('seeds', '12');
    expect(screen.getByText('1 to bonus')).toBeInTheDocument();
    expect(screen.getByText('3 to unlock Downy Feather Badge and Raven Theme')).toBeInTheDocument();
  });

  it('renders a zero streak cleanly', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 10,
        birdsIdentified: 7,
        currentStreak: 0,
        bestStreak: 9,
        seeds: 12,
      })
    );

    render(<StatsBar refreshTrigger={0} />);

    expectStatValue('2 to bonus', '0');
  });

  it('refreshes when the trigger changes', async () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 4,
        birdsIdentified: 2,
        currentStreak: 1,
        bestStreak: 3,
        seeds: 1,
      })
    );

    const view = render(<StatsBar refreshTrigger={0} />);
    expectStatValue('acc', '50%');

    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 5,
        birdsIdentified: 5,
        currentStreak: 5,
        bestStreak: 5,
        seeds: 9,
      })
    );
    notifyStoredValueChanged('birdScore');

    view.rerender(<StatsBar refreshTrigger={1} />);

    await waitFor(() => {
      expectStatValue('acc', '100%');
    });
    expectStatValue('seeds', '9');
  });

  it('delays the seed popup after a resolved round', () => {
    vi.useFakeTimers();

    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 10,
        birdsIdentified: 7,
        currentStreak: 4,
        bestStreak: 9,
        seeds: 12,
      })
    );

    const view = render(<StatsBar refreshTrigger={0} />);

    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 11,
        birdsIdentified: 8,
        currentStreak: 5,
        bestStreak: 10,
        seeds: 19,
      })
    );
    notifyStoredValueChanged('birdScore');

    const roundResult: GameRoundResult = {
      isCorrect: true,
      isReal: true,
      chosenResponse: 'real',
      roundSeedsEarned: 7,
      seedsEarned: 7,
      currentStreak: 5,
      bestStreak: 10,
      birdsSeen: 11,
      birdsIdentified: 8,
      usedHintTypes: [],
      streakProtected: false,
      earnedBadgeName: null,
      unlockedThemeName: null,
      missionRewards: [],
      missionSetBonusSeedsEarned: 0,
      completedDailyMissionSet: false,
      dailyMissionStreak: null,
    };

    view.rerender(<StatsBar refreshTrigger={1} roundAnimation={{ id: 1, result: roundResult }} />);

    expect(screen.queryByText('+7')).not.toBeInTheDocument();
    expectStatValue('seeds', '19');

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('+7')).toBeInTheDocument();
    expectStatValue('seeds', '19');
  });

  it('does not mention a theme when that theme is already unlocked', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 40,
        birdsIdentified: 11,
        currentStreak: 2,
        bestStreak: 6,
        seeds: 0,
      })
    );
    localStorage.setItem('unlockedThemes', JSON.stringify(['Robin']));

    render(<StatsBar refreshTrigger={0} />);

    expect(screen.getByText('14 to unlock Contour Feather Badge')).toBeInTheDocument();
    expect(screen.queryByText(/Robin Theme/i)).not.toBeInTheDocument();
  });

  it('shows streak insurance before the player can afford it', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 10,
        birdsIdentified: 7,
        currentStreak: 5,
        bestStreak: 9,
        seeds: 9,
      })
    );

    render(<StatsBar refreshTrigger={0} />);

    expect(screen.getByText('Streak Insurance')).toBeInTheDocument();
    expect(screen.getByText('Bank 1 more seeds to protect your next guess.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Need 1 more' })).toBeDisabled();
  });

  it('clears insurance purchase errors after the player advances the round', async () => {
    mockedHasSupabaseEnv.mockReturnValue(true);
    mockedPurchaseStreakInsuranceDirect.mockRejectedValue(
      new Error('Streak insurance is already armed for your next guess.')
    );

    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 10,
        birdsIdentified: 7,
        currentStreak: 5,
        bestStreak: 9,
        seeds: 40,
      })
    );

    const view = render(<StatsBar refreshTrigger={0} />);

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Protect Streak' }));

    await waitFor(() => {
      expect(screen.getByText('Streak insurance is already armed for your next guess.')).toBeInTheDocument();
    });

    view.rerender(<StatsBar refreshTrigger={1} />);

    await waitFor(() => {
      expect(screen.queryByText('Streak insurance is already armed for your next guess.')).not.toBeInTheDocument();
    });
  });

  it('shows a loading state and blocks repeated taps while buying streak insurance', async () => {
    mockedHasSupabaseEnv.mockReturnValue(true);

    let resolvePurchase: ((value: {
      action: 'purchase-streak-insurance';
      progressSummary: {
        birdsSeen: number;
        birdsIdentified: number;
        seeds: number;
        currentStreak: number;
        bestStreak: number;
        currentDailyStreak: number;
        bestDailyStreak: number;
      };
      insuranceState: {
        active: boolean;
        protectedMissesRemaining: number;
        cost: number;
        purchasedAtStreak: number;
      };
    }) => void) | null = null;

    mockedPurchaseStreakInsuranceDirect.mockImplementation(
      () => new Promise((resolve) => {
        resolvePurchase = resolve;
      })
    );

    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 10,
        birdsIdentified: 7,
        currentStreak: 5,
        bestStreak: 9,
        seeds: 40,
      })
    );

    render(<StatsBar refreshTrigger={0} />);

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole('button', { name: /Protect Streak/i }));

    await waitFor(() => {
      expect(mockedPurchaseStreakInsuranceDirect).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole('button', { name: /Protecting/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Protecting/i }));
    expect(mockedPurchaseStreakInsuranceDirect).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePurchase?.({
        action: 'purchase-streak-insurance',
        progressSummary: {
          birdsSeen: 10,
          birdsIdentified: 7,
          seeds: 30,
          currentStreak: 5,
          bestStreak: 9,
          currentDailyStreak: 0,
          bestDailyStreak: 0,
        },
        insuranceState: {
          active: true,
          protectedMissesRemaining: 1,
          cost: 10,
          purchasedAtStreak: 5,
        },
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Protecting/i })).not.toBeInTheDocument();
    });
  });
});