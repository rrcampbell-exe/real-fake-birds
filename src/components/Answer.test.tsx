import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Answer from './Answer';

const { confettiMock } = vi.hoisted(() => ({
  confettiMock: vi.fn(),
}));

vi.mock('canvas-confetti', () => ({
  default: confettiMock,
}));

describe('Answer', () => {
  it('renders answer details and triggers the next-bird action', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 8,
        birdsIdentified: 6,
        currentStreak: 3,
        bestStreak: 3,
        seeds: 0,
      })
    );
    const onTryAgain = vi.fn();

    render(
      <Answer
        birdData="Blue Robin"
        isReal
        isStreak={false}
        isCorrect
        isMilestone={false}
        seedsEarned={0}
        newThemeUnlockName={null}
        earnedBadgeName={null}
        onTryAgain={onTryAgain}
      />
    );

    expect(screen.getByText('Blue Robin')).toBeInTheDocument();
    expect(screen.getByText('Real')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next Bird' }));
    expect(onTryAgain).toHaveBeenCalled();
  });

  it('fires confetti when a streak or milestone is achieved', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 8,
        birdsIdentified: 6,
        currentStreak: 5,
        bestStreak: 5,
        seeds: 2,
      })
    );

    render(
      <Answer
        birdData="Blue Robin"
        isReal={false}
        isStreak
        isCorrect
        isMilestone={false}
        seedsEarned={2}
        newThemeUnlockName={null}
        earnedBadgeName={null}
        onTryAgain={vi.fn()}
      />
    );

    expect(confettiMock).toHaveBeenCalled();
  });

  it('shows seed rewards and theme unlock celebrations', () => {
    render(
      <Answer
        birdData="Blue Robin"
        isReal
        isStreak={false}
        isCorrect
        isMilestone
        seedsEarned={7}
        newThemeUnlockName="Raven"
        earnedBadgeName="Downy Feather"
        onTryAgain={vi.fn()}
      />
    );

    expect(screen.getByText('Earned the Downy Feather Badge!')).toBeInTheDocument();
    expect(screen.getByText('+7 seeds')).toBeInTheDocument();
    expect(screen.getByText('Unlocked Raven Theme!')).toBeInTheDocument();
  });

  it('uses the singular seed label when exactly one seed is earned', () => {
    render(
      <Answer
        birdData="Blue Robin"
        isReal
        isStreak={false}
        isCorrect
        isMilestone={false}
        seedsEarned={1}
        newThemeUnlockName={null}
        earnedBadgeName={null}
        onTryAgain={vi.fn()}
      />
    );

    expect(screen.getByText('+1 seed')).toBeInTheDocument();
    expect(screen.queryByText('+1 seeds')).not.toBeInTheDocument();
  });

  it('does not fire confetti for a plain correct answer with only the base seed reward', () => {
    render(
      <Answer
        birdData="Blue Robin"
        isReal
        isStreak={false}
        isCorrect
        isMilestone={false}
        seedsEarned={1}
        newThemeUnlockName={null}
        earnedBadgeName={null}
        onTryAgain={vi.fn()}
      />
    );

    expect(confettiMock).not.toHaveBeenCalled();
  });
});