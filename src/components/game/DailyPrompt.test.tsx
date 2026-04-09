import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DailyPrompt from './DailyPrompt';

vi.mock('@/hooks/useStoredValue', () => ({
  useStoredJson: vi.fn(),
  notifyStoredValueChanged: vi.fn(),
}));

vi.mock('@/hooks/useDailyChallengeState', () => ({
  useDailyChallengeState: vi.fn(),
}));

vi.mock('@/hooks/useSound', () => ({
  useSound: vi.fn(),
}));

import { notifyStoredValueChanged, useStoredJson } from '@/hooks/useStoredValue';
import { useDailyChallengeState } from '@/hooks/useDailyChallengeState';
import { useSound } from '@/hooks/useSound';

describe('DailyPrompt', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(useStoredJson).mockReset();
    vi.mocked(notifyStoredValueChanged).mockReset();
    vi.mocked(useDailyChallengeState).mockReset();
    vi.mocked(useSound).mockReset();
    vi.mocked(useSound).mockReturnValue({ play: vi.fn() } as ReturnType<typeof useSound>);
  });

  it('renders nothing when the challenge is complete', () => {
    vi.mocked(useDailyChallengeState).mockReturnValue({
      state: { date: '2026-04-09' },
      isComplete: true,
    } as ReturnType<typeof useDailyChallengeState>);
    vi.mocked(useStoredJson).mockReturnValue(null);

    const { container } = render(<DailyPrompt />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the prompt was already seen for today', () => {
    vi.mocked(useDailyChallengeState).mockReturnValue({
      state: { date: '2026-04-09' },
      isComplete: false,
    } as ReturnType<typeof useDailyChallengeState>);
    vi.mocked(useStoredJson).mockReturnValue('2026-04-09');

    const { container } = render(<DailyPrompt />);

    expect(container).toBeEmptyDOMElement();
  });

  it('marks the prompt seen and plays audio when dismissed', () => {
    const play = vi.fn();
    vi.mocked(useDailyChallengeState).mockReturnValue({
      state: { date: '2026-04-09' },
      isComplete: false,
    } as ReturnType<typeof useDailyChallengeState>);
    vi.mocked(useStoredJson).mockReturnValue(null);
    vi.mocked(useSound).mockReturnValue({ play } as ReturnType<typeof useSound>);

    render(<DailyPrompt />);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss daily prompt' }));

    expect(play).toHaveBeenCalledWith('navTap');
    expect(localStorage.getItem('dailyPromptSeenDate')).toBe('"2026-04-09"');
    expect(notifyStoredValueChanged).toHaveBeenCalledWith('dailyPromptSeenDate');
  });

  it('marks the prompt seen and plays audio when navigating to daily', () => {
    const play = vi.fn();
    vi.mocked(useDailyChallengeState).mockReturnValue({
      state: { date: '2026-04-09' },
      isComplete: false,
    } as ReturnType<typeof useDailyChallengeState>);
    vi.mocked(useStoredJson).mockReturnValue(null);
    vi.mocked(useSound).mockReturnValue({ play } as ReturnType<typeof useSound>);

    render(<DailyPrompt />);

    fireEvent.click(screen.getByRole('link', { name: 'Go to Daily' }));

    expect(play).toHaveBeenCalledWith('navTap');
    expect(localStorage.getItem('dailyPromptSeenDate')).toBe('"2026-04-09"');
  });
});
