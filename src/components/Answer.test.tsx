import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Answer from './Answer';
import type { HintState } from '@/types';

const { confettiMock } = vi.hoisted(() => ({
  confettiMock: vi.fn(),
}));

vi.mock('canvas-confetti', () => ({
  default: confettiMock,
}));

const emptyHints: HintState = {
  fact: null,
  image: null,
};

describe('Answer', () => {
  beforeEach(() => {
    confettiMock.mockClear();
    localStorage.clear();
  });

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
    const onAction = vi.fn();

    render(
      <Answer
        birdData="Blue Robin"
        isReal
        regionLabel="Algeria"
        sciName="Cyanocitta cristata"
        fact="Blue Robin is known for its vivid plumage."
        hints={emptyHints}
        isStreak={false}
        isCorrect
        isMilestone={false}
        seedsEarned={0}
        newThemeUnlockName={null}
        earnedBadgeName={null}
        onAction={onAction}
      />
    );

    expect(screen.getByText('Blue Robin')).toBeInTheDocument();
    expect(screen.getByText('Real')).toBeInTheDocument();
    expect(screen.getByText('Spotted in Algeria')).toBeInTheDocument();
    expect(screen.getByText('Cyanocitta cristata')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next Bird' }));
    expect(onAction).toHaveBeenCalled();
  });

  it('fires confetti when a major streak checkpoint is achieved', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 8,
        birdsIdentified: 6,
        currentStreak: 10,
        bestStreak: 10,
        seeds: 2,
      })
    );

    render(
      <Answer
        birdData="Blue Robin"
        isReal={false}
        regionLabel={null}
        sciName={null}
        fact={null}
        hints={emptyHints}
        isStreak
        isCorrect
        isMilestone={false}
        seedsEarned={2}
        newThemeUnlockName={null}
        earnedBadgeName={null}
        onAction={vi.fn()}
      />
    );

    expect(confettiMock).toHaveBeenCalled();
  });

  it('fires confetti for a minor streak checkpoint', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 18,
        birdsIdentified: 15,
        currentStreak: 15,
        bestStreak: 15,
        seeds: 2,
      })
    );

    render(
      <Answer
        birdData="Blue Robin"
        isReal={false}
        regionLabel={null}
        sciName={null}
        fact={null}
        hints={emptyHints}
        isStreak
        isCorrect
        isMilestone={false}
        seedsEarned={6}
        newThemeUnlockName={null}
        earnedBadgeName={null}
        onAction={vi.fn()}
      />
    );

    expect(confettiMock).toHaveBeenCalled();
  });

  it('shows seed rewards and theme unlock celebrations', () => {
    render(
      <Answer
        birdData="Blue Robin"
        isReal
        regionLabel="Algeria"
        sciName="Cyanocitta cristata"
        fact="A bright bird from the north."
        hints={emptyHints}
        isStreak={false}
        isCorrect
        isMilestone
        seedsEarned={7}
        newThemeUnlockName="Raven"
        earnedBadgeName="Downy Feather"
        onAction={vi.fn()}
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
        regionLabel="Algeria"
        sciName="Cyanocitta cristata"
        fact="A bright bird from the north."
        hints={emptyHints}
        isStreak={false}
        isCorrect
        isMilestone={false}
        seedsEarned={1}
        newThemeUnlockName={null}
        earnedBadgeName={null}
        onAction={vi.fn()}
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
        regionLabel="Algeria"
        sciName="Cyanocitta cristata"
        fact="A bright bird from the north."
        hints={emptyHints}
        isStreak={false}
        isCorrect
        isMilestone={false}
        seedsEarned={1}
        newThemeUnlockName={null}
        earnedBadgeName={null}
        onAction={vi.fn()}
      />
    );

    expect(confettiMock).not.toHaveBeenCalled();
  });

  it('shows a themed fake field note without exposing fake bird metadata', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    render(
      <Answer
        birdData="Campbell's Striped Algerian Blue-bellied Robin"
        isReal={false}
        regionLabel={null}
        sciName={null}
        fact={null}
        hints={emptyHints}
        isStreak={false}
        isCorrect
        isMilestone={false}
        seedsEarned={0}
        newThemeUnlockName={null}
        earnedBadgeName={null}
        onAction={vi.fn()}
      />
    );

    expect(screen.getByText('Fake Field Notes')).toBeInTheDocument();
    expect(screen.getByText('This bird was made up. We still love it, though!')).toBeInTheDocument();
    expect(screen.queryByText(/Surname:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Color:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Type:/)).not.toBeInTheDocument();
  });

  it('can select a different fake field note copy', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    render(
      <Answer
        birdData="Shy Willow Sparrow"
        isReal={false}
        regionLabel={null}
        sciName={null}
        fact={null}
        hints={emptyHints}
        isStreak={false}
        isCorrect
        isMilestone={false}
        seedsEarned={0}
        newThemeUnlockName={null}
        earnedBadgeName={null}
        onAction={vi.fn()}
      />
    );

    expect(screen.getByText('A counterfeit little creature, but a memorable one.')).toBeInTheDocument();
  });

  it('prefers a purchased fact hint over the background fact', () => {
    render(
      <Answer
        birdData="Blue Robin"
        isReal
        regionLabel="Algeria"
        sciName="Cyanocitta cristata"
        fact="Background fact."
        hints={{
          fact: { type: 'fact', content: 'Purchased fact hint.' },
          image: null,
        }}
        isStreak={false}
        isCorrect
        isMilestone={false}
        seedsEarned={0}
        newThemeUnlockName={null}
        earnedBadgeName={null}
        onAction={vi.fn()}
      />
    );

    expect(screen.getByText('Purchased fact hint.')).toBeInTheDocument();
    expect(screen.queryByText('Background fact.')).not.toBeInTheDocument();
  });

  it('supports a custom action label', () => {
    render(
      <Answer
        birdData="Blue Robin"
        isReal
        regionLabel="Algeria"
        sciName="Cyanocitta cristata"
        fact="Background fact."
        hints={emptyHints}
        isStreak={false}
        isCorrect
        isMilestone={false}
        seedsEarned={0}
        newThemeUnlockName={null}
        earnedBadgeName={null}
        actionLabel="View Summary"
        onAction={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'View Summary' })).toBeInTheDocument();
  });

  it('shows a journal link when the bird is newly discovered', () => {
    render(
      <Answer
        birdData="Blue Robin"
        isReal
        regionLabel="Algeria"
        sciName="Cyanocitta cristata"
        fact="Background fact."
        hints={emptyHints}
        isStreak={false}
        isCorrect
        isMilestone={false}
        seedsEarned={0}
        newThemeUnlockName={null}
        earnedBadgeName={null}
        isNewBirdEncounter
        onAction={vi.fn()}
      />
    );

    expect(screen.getByRole('link', { name: 'A new bird for your field journal!' })).toHaveAttribute('href', '/journal');
  });
});