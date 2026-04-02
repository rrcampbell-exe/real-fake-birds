import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameSection from './GameSection';

vi.mock('@/hooks/useGameState', () => ({
  useGameState: vi.fn(),
}));

vi.mock('./game/BirdCard', () => ({
  default: ({ state }: { state: string }) => <div>BirdCard:{state}</div>,
}));

vi.mock('./LoadingState', () => ({
  default: () => <div>LoadingState</div>,
}));

vi.mock('./Answer', () => ({
  default: () => <div>AnswerContent</div>,
}));

vi.mock('./Error', () => ({
  default: () => <div>ErrorState</div>,
}));

vi.mock('@/components/StatsBar', () => ({
  default: () => <div>StatsBar</div>,
}));

import { useGameState } from '@/hooks/useGameState';

const mockedUseGameState = vi.mocked(useGameState);

describe('GameSection', () => {
  it('renders the loading card state when loading', () => {
    mockedUseGameState.mockReturnValue({
      birdData: '',
      earnedBadgeName: null,
      isReal: false,
      hasAnswered: false,
      isLoading: true,
      isError: false,
      isCorrect: false,
      isStreak: false,
      isMilestone: false,
      hintError: null,
      hintErrorType: null,
      hintLoading: { fact: false, image: false },
      hints: { fact: null, image: null },
      newThemeUnlockName: null,
      requestHint: vi.fn(),
      seedsBalance: 0,
      seedsEarned: 0,
      showQuestion: false,
      handleAnswer: vi.fn(),
      tryAgain: vi.fn(),
    });

    render(<GameSection />);

    expect(screen.getByText('StatsBar')).toBeInTheDocument();
    expect(screen.getByText('BirdCard:loading')).toBeInTheDocument();
  });

  it('renders the error state and hides the card when errored', () => {
    mockedUseGameState.mockReturnValue({
      birdData: '',
      earnedBadgeName: null,
      isReal: false,
      hasAnswered: false,
      isLoading: false,
      isError: true,
      isCorrect: false,
      isStreak: false,
      isMilestone: false,
      hintError: null,
      hintErrorType: null,
      hintLoading: { fact: false, image: false },
      hints: { fact: null, image: null },
      newThemeUnlockName: null,
      requestHint: vi.fn(),
      seedsBalance: 0,
      seedsEarned: 0,
      showQuestion: false,
      handleAnswer: vi.fn(),
      tryAgain: vi.fn(),
    });

    render(<GameSection />);

    expect(screen.getByText('ErrorState')).toBeInTheDocument();
    expect(screen.queryByText(/BirdCard:/)).not.toBeInTheDocument();
  });

  it('renders the question card state when ready for a guess', () => {
    mockedUseGameState.mockReturnValue({
      birdData: 'Silver Finch',
      earnedBadgeName: null,
      isReal: true,
      hasAnswered: false,
      isLoading: false,
      isError: false,
      isCorrect: false,
      isStreak: false,
      isMilestone: false,
      hintError: null,
      hintErrorType: null,
      hintLoading: { fact: false, image: false },
      hints: { fact: null, image: null },
      newThemeUnlockName: null,
      requestHint: vi.fn(),
      seedsBalance: 100,
      seedsEarned: 0,
      showQuestion: true,
      handleAnswer: vi.fn(),
      tryAgain: vi.fn(),
    });

    render(<GameSection />);

    expect(screen.getByText('BirdCard:question')).toBeInTheDocument();
  });
});