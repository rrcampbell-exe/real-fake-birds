import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DailyChallengePage from './page';

vi.mock('@/hooks/useGameState', () => ({
  useGameState: vi.fn(),
}));

vi.mock('@/hooks/useDailyChallengeState', () => ({
  useDailyChallengeState: vi.fn(),
}));

vi.mock('@/components/Answer', () => ({
  default: ({ actionLabel, onAction }: { actionLabel?: string; onAction: () => void }) => (
    <button type="button" onClick={onAction}>{actionLabel ?? 'Next Bird'}</button>
  ),
}));

vi.mock('@/components/Error', () => ({
  default: () => <div>ErrorState</div>,
}));

vi.mock('@/components/LoadingState', () => ({
  default: () => <div>LoadingState</div>,
}));

vi.mock('@/components/StatsBar', () => ({
  default: () => <div>StatsBar</div>,
}));

vi.mock('@/components/game/BirdCard', () => ({
  default: ({ answerContent }: { answerContent: React.ReactNode }) => <div>{answerContent}</div>,
}));

vi.mock('@/components/game/DailyChallengeCard', () => ({
  default: () => <div>DailyChallengeCard</div>,
}));

vi.mock('@/components/game/MissionPanel', () => ({
  default: () => <div>MissionPanel</div>,
}));

vi.mock('@/components/ShareButton', () => ({
  default: () => <div>ShareButton</div>,
}));

import { useDailyChallengeState } from '@/hooks/useDailyChallengeState';
import { useGameState } from '@/hooks/useGameState';
import type { GameRoundResult } from '@/types';

const mockedUseGameState = vi.mocked(useGameState);
const mockedUseDailyChallengeState = vi.mocked(useDailyChallengeState);

describe('DailyChallengePage', () => {
  it('shows the active next round number while a challenge is in progress', () => {
    mockedUseDailyChallengeState.mockReturnValue({
      state: {
        date: '2026-04-03',
        roundsPlayed: 2,
        correctAnswers: 1,
        completed: false,
        completionBonusAwarded: false,
        perfectBonusAwarded: false,
        bonusSeedsAwarded: 0,
        roundResults: [true, false],
      },
      history: [],
      challengeStreak: 1,
      roundsRemaining: 3,
      isComplete: false,
      canPlay: true,
      recordRound: vi.fn(),
    });

    mockedUseGameState.mockReturnValue({
      birdData: 'Blue Robin',
      isReal: true,
      regionLabel: 'Algeria',
      sciName: 'Birdus birdus',
      fact: 'A bird fact',
      hasAnswered: false,
      isLoading: false,
      isError: false,
      isCorrect: false,
      isStreak: false,
      isMilestone: false,
      seedsEarned: 0,
      newThemeUnlockName: null,
      earnedBadgeName: null,
      hints: { fact: null, image: null },
      hintError: null,
      hintErrorType: null,
      hintLoading: { fact: false, image: false },
      seedsBalance: 10,
      showQuestion: true,
      handleAnswer: vi.fn(),
      requestHint: vi.fn(),
      tryAgain: vi.fn(),
    });

    render(<DailyChallengePage />);

    expect(screen.getByText('Round 3 of 5')).toBeInTheDocument();
  });

  it('uses the resolved final round state for the header and summary action before storage catches up', () => {
    let capturedOnRoundResolved: ((result: GameRoundResult) => void) | undefined;

    mockedUseDailyChallengeState.mockReturnValue({
      state: {
        date: '2026-04-03',
        roundsPlayed: 4,
        correctAnswers: 3,
        completed: false,
        completionBonusAwarded: false,
        perfectBonusAwarded: false,
        bonusSeedsAwarded: 0,
        roundResults: [true, true, false, true],
      },
      history: [],
      challengeStreak: 2,
      roundsRemaining: 1,
      isComplete: false,
      canPlay: true,
      recordRound: vi.fn().mockReturnValue({
        date: '2026-04-03',
        roundsPlayed: 5,
        correctAnswers: 4,
        completed: true,
        completionBonusAwarded: true,
        perfectBonusAwarded: false,
        bonusSeedsAwarded: 25,
        roundResults: [true, true, false, true, true],
      }),
    });

    mockedUseGameState.mockImplementation((options) => {
      capturedOnRoundResolved = options?.onRoundResolved;

      return {
        birdData: 'Blue Robin',
        isReal: true,
        regionLabel: 'Algeria',
        sciName: 'Birdus birdus',
        fact: 'A bird fact',
        hasAnswered: true,
        isLoading: false,
        isError: false,
        isCorrect: true,
        isStreak: false,
        isMilestone: false,
        seedsEarned: 1,
        newThemeUnlockName: null,
        earnedBadgeName: null,
        hints: { fact: null, image: null },
        hintError: null,
        hintErrorType: null,
        hintLoading: { fact: false, image: false },
        seedsBalance: 10,
        showQuestion: false,
        handleAnswer: vi.fn(),
        requestHint: vi.fn(),
        tryAgain: vi.fn(),
      };
    });

    render(<DailyChallengePage />);

    act(() => {
      capturedOnRoundResolved?.({
        isCorrect: true,
        isReal: true,
        chosenResponse: 'real',
        seedsEarned: 1,
        currentStreak: 1,
        bestStreak: 1,
        birdsSeen: 5,
        birdsIdentified: 4,
        usedHintTypes: [],
        streakProtected: false,
        earnedBadgeName: null,
        unlockedThemeName: null,
      });
    });

    expect(screen.getByText('Round 5 of 5')).toBeInTheDocument();
    expect(screen.getByText('4 correct')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'View Summary' }));

    expect(screen.getByText('4/5 birds right today')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('renders the summary surface when the daily challenge is complete', () => {
    mockedUseDailyChallengeState.mockReturnValue({
      state: {
        date: '2026-04-03',
        roundsPlayed: 5,
        correctAnswers: 4,
        completed: true,
        completionBonusAwarded: true,
        perfectBonusAwarded: false,
        bonusSeedsAwarded: 25,
        roundResults: [true, true, true, true, false],
      },
      history: [],
      challengeStreak: 2,
      roundsRemaining: 0,
      isComplete: true,
      canPlay: false,
      recordRound: vi.fn(),
    });

    mockedUseGameState.mockReturnValue({
      birdData: 'Blue Robin',
      isReal: true,
      regionLabel: 'Algeria',
      sciName: 'Birdus birdus',
      fact: 'A bird fact',
      hasAnswered: true,
      isLoading: false,
      isError: false,
      isCorrect: true,
      isStreak: false,
      isMilestone: false,
      seedsEarned: 1,
      newThemeUnlockName: null,
      earnedBadgeName: null,
      hints: { fact: null, image: null },
      hintError: null,
      hintErrorType: null,
      hintLoading: { fact: false, image: false },
      seedsBalance: 10,
      showQuestion: false,
      handleAnswer: vi.fn(),
      requestHint: vi.fn(),
      tryAgain: vi.fn(),
    });

    render(<DailyChallengePage />);

    expect(screen.getByText('4/5 birds right today')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });
});