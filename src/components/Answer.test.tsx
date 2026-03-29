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
      })
    );

    render(
      <Answer
        birdData="Blue Robin"
        isReal={false}
        isStreak
        isCorrect
        isMilestone={false}
        onTryAgain={vi.fn()}
      />
    );

    expect(confettiMock).toHaveBeenCalled();
  });
});