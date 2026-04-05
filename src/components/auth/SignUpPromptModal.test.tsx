import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignUpPromptModal from './SignUpPromptModal';

vi.mock('@/components/auth/UsernameAvailabilityCard', () => ({
  default: ({ onAuthSuccess }: { onAuthSuccess?: () => void }) => (
    <div>
      <p>UsernameAvailabilityCard</p>
      <button type="button" onClick={onAuthSuccess}>Finish auth</button>
    </div>
  ),
}));

vi.mock('@/lib/auth/account-sync', () => ({
  fetchWeeklyLeaderboard: vi.fn(),
}));

vi.mock('@/lib/supabase/env', () => ({
  hasSupabaseEnv: vi.fn(),
}));

vi.mock('@/lib/analytics', () => ({
  track: vi.fn(),
}));

import { fetchWeeklyLeaderboard } from '@/lib/auth/account-sync';
import { track } from '@/lib/analytics';
import { hasSupabaseEnv } from '@/lib/supabase/env';

const mockedFetchWeeklyLeaderboard = vi.mocked(fetchWeeklyLeaderboard);
const mockedHasSupabaseEnv = vi.mocked(hasSupabaseEnv);
const mockedTrack = vi.mocked(track);

describe('SignUpPromptModal', () => {
  beforeEach(() => {
    mockedFetchWeeklyLeaderboard.mockReset();
    mockedHasSupabaseEnv.mockReturnValue(true);
    mockedTrack.mockReset();
    localStorage.clear();
  });

  it('renders the account card and dismisses through the close button', () => {
    const onDismiss = vi.fn();

    render(
      <SignUpPromptModal
        birdsSeen={10}
        birdsIdentified={7}
        seeds={4}
        threshold={10}
        onDismiss={onDismiss}
        onAuthenticated={vi.fn()}
      />
    );

    expect(screen.getByText('UsernameAvailabilityCard')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close sign up prompt' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(mockedTrack).toHaveBeenCalledWith('signup_prompt_dismissed', expect.objectContaining({ threshold: 10 }));
  });

  it('dismisses when Escape is pressed', () => {
    const onDismiss = vi.fn();

    render(
      <SignUpPromptModal
        birdsSeen={10}
        birdsIdentified={7}
        seeds={4}
        threshold={10}
        onDismiss={onDismiss}
        onAuthenticated={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('forwards auth success from the embedded account card', () => {
    const onAuthenticated = vi.fn();

    render(
      <SignUpPromptModal
        birdsSeen={10}
        birdsIdentified={7}
        seeds={4}
        threshold={10}
        onDismiss={vi.fn()}
        onAuthenticated={onAuthenticated}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Finish auth' }));

    expect(onAuthenticated).toHaveBeenCalledTimes(1);
    expect(mockedTrack).toHaveBeenCalledWith('signup_prompt_authenticated', expect.objectContaining({ threshold: 10 }));
  });

  it('shows leaderboard context for 50-plus birds when available', async () => {
    mockedFetchWeeklyLeaderboard.mockResolvedValue({
      action: 'get-leaderboard',
      leaderboard: {
        weekStart: '2026-04-06',
        endsAt: '2026-04-13T00:00:00.000Z',
        challenge: {
          id: 'seed-collector',
          name: 'Seed Collector',
          description: 'Gather more seeds this week than anyone else.',
          icon: 'sprout',
          primaryLabel: 'Seeds earned',
          tiebreakerLabel: 'Accuracy',
          metric: 'weeklySeedsEarned',
          tiebreakerMetric: 'accuracy',
        },
        currentUserEntry: null,
        entries: Array.from({ length: 10 }, (_, index) => ({
          rank: index + 1,
          username: `birder-${index + 1}`,
          avatarPalette: null,
          primaryValue: 120 - index,
          primaryDisplayValue: `${120 - index} seeds`,
          tiebreakerValue: 92 - index,
          tiebreakerDisplayValue: `${92 - index}% accuracy`,
          birdsSeen: 60 - index,
          isCurrentUser: false,
        })),
      },
    });

    render(
      <SignUpPromptModal
        birdsSeen={58}
        birdsIdentified={41}
        seeds={36}
        threshold={50}
        onDismiss={vi.fn()}
        onAuthenticated={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/This week is all about stockpiling seeds/i)).toBeInTheDocument();
    });
  });

  it('tracks prompt impressions on mount', () => {
    render(
      <SignUpPromptModal
        birdsSeen={25}
        birdsIdentified={15}
        seeds={12}
        threshold={25}
        onDismiss={vi.fn()}
        onAuthenticated={vi.fn()}
      />
    );

    expect(mockedTrack).toHaveBeenCalledWith('signup_prompt_viewed', expect.objectContaining({
      threshold: 25,
      birds_seen: 25,
      birds_identified: 15,
      seeds: 12,
    }));
  });
});