import type React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Answer from './Answer';
import type { HintState } from '@/types';
import { CURRENT_ROUND_JOURNAL_REVEAL_KEY, PENDING_JOURNAL_TARGET_KEY } from '@/lib/utils/bird-journal';

const { confettiMock, playMock, pushMock } = vi.hoisted(() => ({
  confettiMock: vi.fn(),
  playMock: vi.fn(),
  pushMock: vi.fn(),
}));

const { trackMock } = vi.hoisted(() => ({
  trackMock: vi.fn(),
}));

vi.mock('canvas-confetti', () => ({
  default: confettiMock,
}));

vi.mock('@/lib/analytics', () => ({
  track: trackMock,
}));

vi.mock('next/image', () => ({
  default: ({ fill: _fill, unoptimized: _unoptimized, priority: _priority, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    unoptimized?: boolean;
    priority?: boolean;
  }) => <img {...props} />,
}));

vi.mock('@/hooks/useSound', () => ({
  useSound: () => ({ play: playMock }),
}));

vi.mock('@/components/birdhouse/BirdhouseToggleButton', () => ({
  default: ({ birdName }: { birdName: string }) => <button type="button">Add {birdName} to Birdhouse</button>,
}));

vi.mock('@/components/birdhouse/BirdhouseSwapSheet', () => ({
  default: () => null,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const emptyHints: HintState = {
  fact: null,
  image: null,
};

const defaultProps: React.ComponentProps<typeof Answer> = {
  birdData: 'Blue Robin',
  isReal: true,
  regionLabel: 'Algeria',
  sciName: 'Cyanocitta cristata',
  fact: 'Blue Robin is known for its vivid plumage.',
  summary: 'Blue Robin is known for its vivid plumage. Another field-guide sentence.',
  articleUrl: 'https://en.wikipedia.org/wiki/Blue_Robin',
  imageUrl: 'https://upload.wikimedia.org/example.jpg',
  contentSource: 'cdn',
  description: 'bird species',
  hints: emptyHints,
  isStreak: false,
  isCorrect: true,
  isMilestone: false,
  seedsEarned: 0,
  newThemeUnlockName: null,
  earnedBadgeName: null,
  isNewBirdEncounter: false,
  onAction: vi.fn(),
};

describe('Answer', () => {
  beforeEach(() => {
    confettiMock.mockClear();
    playMock.mockClear();
    pushMock.mockClear();
    trackMock.mockClear();
    localStorage.clear();
  });

  it('renders answer details, cached image, and triggers the next-bird action', () => {
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

    render(<Answer {...defaultProps} onAction={onAction} />);

    expect(screen.getByText('Blue Robin')).toBeInTheDocument();
    expect(screen.getByText('Real')).toBeInTheDocument();
    expect(screen.getByText('Cyanocitta cristata')).toBeInTheDocument();
    expect(screen.getByText('Recently seen in Algeria')).toBeInTheDocument();
    expect(screen.getByText('Field Notes')).toBeInTheDocument();
    expect(screen.getByText('Blue Robin is known for its vivid plumage.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Learn more about this bird' })).toHaveAttribute('href', '/journal?bird=real%3Ablue-robin');
    expect(screen.getByRole('button', { name: 'Add Blue Robin to Birdhouse' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next Bird' }));
    expect(onAction).toHaveBeenCalled();
  });

  it('shows a shimmer over the real-bird image until it loads', () => {
    render(<Answer {...defaultProps} />);

    expect(screen.getByTestId('answer-image-shimmer')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Blue Robin' })).toBeInTheDocument();
  });

  it('keeps attribution links outside the journal link wrapper', () => {
    const { container } = render(
      <Answer
        {...defaultProps}
        attribution={{
          artist: 'Gediminas',
          license: 'CC BY-SA 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
        }}
      />
    );

    expect(screen.getByText(/Photo: Gediminas/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'CC BY-SA 4.0' })).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by-sa/4.0'
    );
    expect(container.querySelector('a a')).toBeNull();
  });

  it('tracks successful image loads separately from fact loads', () => {
    render(<Answer {...defaultProps} />);

    fireEvent.load(screen.getByRole('img', { name: 'Blue Robin' }));

    expect(trackMock).toHaveBeenCalledWith(
      'bird_content_loaded',
      expect.objectContaining({
        source: 'cdn',
        content_type: 'image',
        load_stage: 'browser',
        outcome: 'success',
      })
    );
  });

  it('shows an image-unavailable fallback when the real-bird image fails', () => {
    render(<Answer {...defaultProps} />);

    fireEvent.error(screen.getByRole('img', { name: 'Blue Robin' }));

    expect(screen.getByText('Image unavailable')).toBeInTheDocument();
    expect(screen.queryByTestId('answer-image-shimmer')).not.toBeInTheDocument();
    expect(trackMock).toHaveBeenCalledWith(
      'bird_content_loaded',
      expect.objectContaining({
        source: 'cdn',
        content_type: 'image',
        load_stage: 'browser',
        outcome: 'failure',
      })
    );
  });

  it('keeps the next-bird action in the top row above the field notes', () => {
    render(<Answer {...defaultProps} />);

    const nextButton = screen.getByRole('button', { name: 'Next Bird' });
    const shareButton = screen.getByRole('button', { name: 'Share' });
    const notesHeading = screen.getByText('Field Notes');

    expect(shareButton.compareDocumentPosition(nextButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(nextButton.compareDocumentPosition(notesHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
        {...defaultProps}
        isReal={false}
        regionLabel={null}
        sciName={null}
        fact={null}
        summary={null}
        articleUrl={null}
        imageUrl={null}
        description={null}
        isStreak
        seedsEarned={2}
      />
    );

    expect(confettiMock).toHaveBeenCalled();
  });

  it('does not fire confetti for a minor streak checkpoint', () => {
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
        {...defaultProps}
        isReal={false}
        regionLabel={null}
        sciName={null}
        fact={null}
        summary={null}
        articleUrl={null}
        imageUrl={null}
        description={null}
        isStreak
        seedsEarned={6}
      />
    );

    expect(confettiMock).not.toHaveBeenCalled();
  });

  it('fires confetti when the player first breaks an eligible personal best', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 22,
        birdsIdentified: 22,
        currentStreak: 11,
        bestStreak: 11,
        activePersonalBestTarget: 10,
        seeds: 9,
      })
    );

    render(
      <Answer
        {...defaultProps}
        isReal={false}
        regionLabel={null}
        sciName={null}
        fact={null}
        summary={null}
        articleUrl={null}
        imageUrl={null}
        description={null}
        justBrokeBestStreak
      />
    );

    expect(confettiMock).toHaveBeenCalled();
  });

  it('keeps milestone celebrations off the answer card surface', () => {
    render(
      <Answer
        {...defaultProps}
        isMilestone
        seedsEarned={7}
        newThemeUnlockName="Raven"
        earnedBadgeName="Downy Feather"
      />
    );

    expect(screen.queryByText('Earned the Downy Feather Badge!')).not.toBeInTheDocument();
    expect(screen.queryByText('Unlocked Raven Theme!')).not.toBeInTheDocument();
    expect(screen.queryByText('+7 seeds')).not.toBeInTheDocument();
  });

  it('does not fire confetti for a plain correct answer with only the base seed reward', () => {
    render(<Answer {...defaultProps} seedsEarned={1} />);

    expect(confettiMock).not.toHaveBeenCalled();
  });

  it('plays the milestone chime when the first bird bonus is awarded', () => {
    vi.useFakeTimers();

    render(<Answer {...defaultProps} firstGameOfDayBonusSeedsEarned={5} />);

    expect(playMock).toHaveBeenCalledWith('milestone');

    vi.runAllTimers();
    expect(playMock).toHaveBeenCalledWith('correct');
    vi.useRealTimers();
  });

  it('shows a themed fake field note without exposing fake bird metadata', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    render(
      <Answer
        {...defaultProps}
        birdData="Campbell's Striped Algerian Blue-bellied Robin"
        isReal={false}
        regionLabel={null}
        sciName={null}
        fact={null}
        summary={null}
        articleUrl={null}
        imageUrl={null}
        description={null}
      />
    );

    expect(screen.getByText('Fake Field Notes')).toBeInTheDocument();
    expect(screen.getByText('This bird was made up. We still love it, though!')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Learn more about this bird' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add campbell's striped algerian blue-bellied robin to birdhouse/i })).toBeInTheDocument();
    expect(screen.queryByText(/Surname:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Color:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Type:/)).not.toBeInTheDocument();
  });

  it('can select a different fake field note copy', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    render(
      <Answer
        {...defaultProps}
        birdData="Shy Willow Sparrow"
        isReal={false}
        regionLabel={null}
        sciName={null}
        fact={null}
        summary={null}
        articleUrl={null}
        imageUrl={null}
        description={null}
      />
    );

    expect(screen.getByText('A counterfeit little creature, but a memorable one.')).toBeInTheDocument();
  });

  it('prefers a purchased fact hint over the background fact', () => {
    render(
      <Answer
        {...defaultProps}
        fact="Background fact."
        hints={{
          fact: { type: 'fact', content: 'Purchased fact hint.' },
          image: null,
        }}
      />
    );

    expect(screen.getByText('Purchased fact hint.')).toBeInTheDocument();
    expect(screen.queryByText('Background fact.')).not.toBeInTheDocument();
  });

  it('does not render the old correctness icon circle', () => {
    render(<Answer {...defaultProps} />);

    expect(screen.queryByLabelText('Correct')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Incorrect')).not.toBeInTheDocument();
  });

  it('supports a custom action label', () => {
    render(<Answer {...defaultProps} actionLabel="View Summary" />);

    expect(screen.getByRole('button', { name: 'View Summary' })).toBeInTheDocument();
  });

  it('shows a learn-more journal link for the specific bird', () => {
    render(<Answer {...defaultProps} isNewBirdEncounter />);

    expect(screen.getByRole('link', { name: 'Learn more about this bird' })).toHaveAttribute('href', '/journal?bird=real%3Ablue-robin');
  });

  it('marks the current bird as revealed before opening the journal link', () => {
    render(<Answer {...defaultProps} isNewBirdEncounter />);

    fireEvent.click(screen.getByRole('link', { name: 'Learn more about this bird' }));

    expect(localStorage.getItem(CURRENT_ROUND_JOURNAL_REVEAL_KEY)).toBe(JSON.stringify('real:blue-robin'));
    expect(localStorage.getItem(PENDING_JOURNAL_TARGET_KEY)).toBe(JSON.stringify('real:blue-robin'));
    expect(pushMock).toHaveBeenCalledWith('/journal?bird=real%3Ablue-robin', { scroll: false });
  });

  it('marks the current bird as revealed when the image link is clicked', () => {
    render(<Answer {...defaultProps} />);

    fireEvent.click(screen.getByRole('link', { name: 'Learn more about this bird' }));

    expect(localStorage.getItem(CURRENT_ROUND_JOURNAL_REVEAL_KEY)).toBe(JSON.stringify('real:blue-robin'));
    expect(localStorage.getItem(PENDING_JOURNAL_TARGET_KEY)).toBe(JSON.stringify('real:blue-robin'));
    expect(pushMock).toHaveBeenCalledWith('/journal?bird=real%3Ablue-robin', { scroll: false });
  });
});
