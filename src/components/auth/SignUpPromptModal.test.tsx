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

vi.mock('@/lib/analytics', () => ({
  track: vi.fn(),
}));

import { track } from '@/lib/analytics';
const mockedTrack = vi.mocked(track);

describe('SignUpPromptModal', () => {
  beforeEach(() => {
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
    expect(screen.getByRole('dialog').className).toContain('bg-[var(--color-modal-bg)]');

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

  it('keeps the prompt focused on achievements and account benefits', async () => {
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
      expect(screen.getByText('58 seen')).toBeInTheDocument();
    });
    expect(screen.getByText('36 seeds')).toBeInTheDocument();
    expect(screen.getByText('1 theme unlocked')).toBeInTheDocument();
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