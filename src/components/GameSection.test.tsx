import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameSection, { buildUnlockToasts } from './GameSection';

vi.mock('@/hooks/useGameState', () => ({
  useGameState: vi.fn(),
}));

vi.mock('@/hooks/useSignUpPrompt', () => ({
  useSignUpPrompt: vi.fn(),
}));

vi.mock('next/image', () => ({
  default: ({
    alt,
    src,
    fill: _fill,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => (
    <img alt={alt} src={src} {...props} />
  ),
}));

vi.mock('./game/BirdCard', () => ({
  default: ({ state, answerContent }: { state: string; answerContent?: React.ReactNode }) => (
    <div>
      <div>BirdCard:{state}</div>
      {state === 'answer' ? answerContent : null}
    </div>
  ),
}));

vi.mock('./LoadingState', () => ({
  default: () => <div>LoadingState</div>,
}));

vi.mock('./Answer', () => ({
  default: ({ onAction }: { onAction: () => void }) => (
    <button type="button" onClick={onAction}>Advance Round</button>
  ),
}));

vi.mock('./Error', () => ({
  default: () => <div>ErrorState</div>,
}));

vi.mock('@/components/StatsBar', () => ({
  default: () => <div>StatsBar</div>,
}));

vi.mock('@/components/WeeklyChallengeBanner', () => ({
  default: () => <div>WeeklyChallengeBanner</div>,
}));

vi.mock('@/components/auth/SignUpPromptModal', () => ({
  default: ({ onDismiss, onAuthenticated }: { onDismiss: () => void; onAuthenticated: () => void }) => (
    <div>
      <p>SignUpPromptModal</p>
      <button type="button" onClick={onDismiss}>Dismiss prompt</button>
      <button type="button" onClick={onAuthenticated}>Authenticate</button>
    </div>
  ),
}));

import { useGameState } from '@/hooks/useGameState';
import { useSignUpPrompt } from '@/hooks/useSignUpPrompt';
import type { GameRoundResult } from '@/types';

const mockedUseGameState = vi.mocked(useGameState);
const mockedUseSignUpPrompt = vi.mocked(useSignUpPrompt);

function createGameState(overrides: Partial<ReturnType<typeof useGameState>> = {}) {
  return {
    birdData: 'Silver Finch',
    earnedBadgeName: null,
    fact: null,
    summary: null,
    articleUrl: null,
    imageUrl: null,
    description: null,
    firstGameOfDayBonusSeedsEarned: 0,
    milestoneRewardSeedsEarned: 0,
    hasAnswered: false,
    handleAnswer: vi.fn(),
    hintError: null,
    hintErrorType: null,
    hintLoading: { fact: false, image: false },
    hints: { fact: null, image: null },
    isCorrect: false,
    isError: false,
    isLoading: false,
    isMilestone: false,
    isNewBirdEncounter: false,
    isReal: true,
    isStreak: false,
    newThemeUnlockName: null,
    regionLabel: null,
    requestHint: vi.fn(),
    sciName: null,
    seedsBalance: 100,
    seedsEarned: 0,
    showQuestion: true,
    specialHintAction: null,
    tryAgain: vi.fn(),
    ...overrides,
  };
}

function createRoundResult(overrides: Partial<GameRoundResult> = {}): GameRoundResult {
  return {
    isCorrect: true,
    isReal: true,
    chosenResponse: 'real',
    roundSeedsEarned: 5,
    seedsEarned: 5,
    firstGameOfDayBonusSeedsEarned: 0,
    milestoneRewardSeedsEarned: 0,
    currentStreak: 3,
    bestStreak: 3,
    birdsSeen: 10,
    birdsIdentified: 8,
    usedHintTypes: [],
    streakProtected: false,
    earnedBadgeName: null,
    unlockedThemeName: null,
    previousBestStreak: 2,
    justBrokeBestStreak: false,
    justLostBestStreak: false,
    personalBestRewardSeeds: 0,
    missionRewards: [],
    missionSetBonusSeedsEarned: 0,
    completedDailyMissionSet: false,
    dailyMissionStreak: null,
    ...overrides,
  };
}

describe('GameSection', () => {
  it('renders the loading card state when loading', () => {
    mockedUseGameState.mockReturnValue(createGameState({
      birdData: '',
      isLoading: true,
      seedsBalance: 0,
      showQuestion: false,
    }));
    mockedUseSignUpPrompt.mockReturnValue({
      birdsSeen: 0,
      birdsIdentified: 0,
      seeds: 0,
      activeThreshold: null,
      shouldPrompt: false,
      dismiss: vi.fn(),
      onAccountCreated: vi.fn(),
    });

    render(<GameSection />);

    expect(screen.getByText('StatsBar')).toBeInTheDocument();
    expect(screen.getByText('BirdCard:loading')).toBeInTheDocument();
  });

  it('renders the error state and hides the card when errored', () => {
    mockedUseGameState.mockReturnValue(createGameState({
      birdData: '',
      isError: true,
      seedsBalance: 0,
      showQuestion: false,
    }));
    mockedUseSignUpPrompt.mockReturnValue({
      birdsSeen: 0,
      birdsIdentified: 0,
      seeds: 0,
      activeThreshold: null,
      shouldPrompt: false,
      dismiss: vi.fn(),
      onAccountCreated: vi.fn(),
    });

    render(<GameSection />);

    expect(screen.getByText('ErrorState')).toBeInTheDocument();
    expect(screen.queryByText(/BirdCard:/)).not.toBeInTheDocument();
  });

  it('renders the question card state when ready for a guess', () => {
    mockedUseGameState.mockReturnValue(createGameState());
    mockedUseSignUpPrompt.mockReturnValue({
      birdsSeen: 0,
      birdsIdentified: 0,
      seeds: 0,
      activeThreshold: null,
      shouldPrompt: false,
      dismiss: vi.fn(),
      onAccountCreated: vi.fn(),
    });

    render(<GameSection />);

    expect(screen.getByText('BirdCard:question')).toBeInTheDocument();
  });

  it('shows the signup prompt instead of advancing when the prompt is eligible', async () => {
    const tryAgain = vi.fn();
    mockedUseGameState.mockReturnValue(createGameState({
      hasAnswered: true,
      showQuestion: false,
      tryAgain,
    }));
    mockedUseSignUpPrompt.mockReturnValue({
      birdsSeen: 10,
      birdsIdentified: 7,
      seeds: 4,
      activeThreshold: 10,
      shouldPrompt: true,
      dismiss: vi.fn(),
      onAccountCreated: vi.fn(),
    });

    render(<GameSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Advance Round' }));

    expect(screen.getByText('SignUpPromptModal')).toBeInTheDocument();
    expect(tryAgain).not.toHaveBeenCalled();
  });

  it('shows lightweight unlock toasts after a milestone round', () => {
    mockedUseGameState.mockReturnValue(createGameState({
      hasAnswered: true,
      showQuestion: false,
      isMilestone: true,
      earnedBadgeName: 'Downy Feather',
      newThemeUnlockName: 'Raven',
    }));
    mockedUseSignUpPrompt.mockReturnValue({
      birdsSeen: 0,
      birdsIdentified: 0,
      seeds: 0,
      activeThreshold: null,
      shouldPrompt: false,
      dismiss: vi.fn(),
      onAccountCreated: vi.fn(),
    });

    render(<GameSection />);

    expect(screen.getByText(/Badge & Theme Unlocked/i)).toBeInTheDocument();
    expect(screen.getByText(/Downy Feather Badge is now yours, and the Raven Theme just joined your flock/i)).toBeInTheDocument();
    expect(screen.getByAltText('Downy Feather badge')).toHaveAttribute('src', '/images/badges/downy_feather.png');
    expect(screen.queryByText(/^Theme Unlocked!$/i)).not.toBeInTheDocument();
  });

  it('shows a first bird bonus toast after the first correct answer of the day', () => {
    mockedUseGameState.mockReturnValue(createGameState({
      hasAnswered: true,
      showQuestion: false,
      firstGameOfDayBonusSeedsEarned: 5,
    }));
    mockedUseSignUpPrompt.mockReturnValue({
      birdsSeen: 0,
      birdsIdentified: 0,
      seeds: 0,
      activeThreshold: null,
      shouldPrompt: false,
      dismiss: vi.fn(),
      onAccountCreated: vi.fn(),
    });

    render(<GameSection />);

    expect(screen.getByText(/First Bird Bonus!/i)).toBeInTheDocument();
    expect(screen.getByText(/That's your first correct bird of the day. Have \+5 bonus seeds!/i)).toBeInTheDocument();
  });

  it('shows a milestone bonus toast for seed-only checkpoints', () => {
    mockedUseGameState.mockReturnValue(createGameState({
      hasAnswered: true,
      isMilestone: true,
      milestoneRewardSeedsEarned: 25,
      showQuestion: false,
    }));
    mockedUseSignUpPrompt.mockReturnValue({
      birdsSeen: 0,
      birdsIdentified: 0,
      seeds: 0,
      activeThreshold: null,
      shouldPrompt: false,
      dismiss: vi.fn(),
      onAccountCreated: vi.fn(),
    });

    render(<GameSection />);

    expect(screen.getByText(/Milestone Bonus!/i)).toBeInTheDocument();
    expect(screen.getByText(/Have \+25 bonus seeds!/i)).toBeInTheDocument();
  });

  it('shows a toast counter only when more than one toast is queued', () => {
    mockedUseGameState.mockReturnValue(createGameState({
      hasAnswered: true,
      showQuestion: false,
      firstGameOfDayBonusSeedsEarned: 5,
      milestoneRewardSeedsEarned: 25,
    }));
    mockedUseSignUpPrompt.mockReturnValue({
      birdsSeen: 0,
      birdsIdentified: 0,
      seeds: 0,
      activeThreshold: null,
      shouldPrompt: false,
      dismiss: vi.fn(),
      onAccountCreated: vi.fn(),
    });

    render(<GameSection />);

    expect(screen.getByText('1 of 2')).toBeInTheDocument();
  });

  it('does not show a toast counter when only one toast is queued', () => {
    mockedUseGameState.mockReturnValue(createGameState({
      hasAnswered: true,
      showQuestion: false,
      firstGameOfDayBonusSeedsEarned: 5,
    }));
    mockedUseSignUpPrompt.mockReturnValue({
      birdsSeen: 0,
      birdsIdentified: 0,
      seeds: 0,
      activeThreshold: null,
      shouldPrompt: false,
      dismiss: vi.fn(),
      onAccountCreated: vi.fn(),
    });

    render(<GameSection />);

    expect(screen.queryByText(/^\d+ of \d+$/i)).not.toBeInTheDocument();
  });
});

describe('buildUnlockToasts', () => {
  it('prefers the daily streak toast over the last mission reward when all daily challenges are completed', () => {
    const toasts = buildUnlockToasts({
      isMilestone: false,
      earnedBadgeName: null,
      newThemeUnlockName: null,
      firstGameOfDayBonusSeedsEarned: 0,
      milestoneRewardSeedsEarned: 0,
      roundResult: createRoundResult({
        missionRewards: [
          {
            missionId: 'mission-1',
            description: 'First mission',
            toastDescription: 'First mission complete.',
            rewardSeeds: 5,
          },
          {
            missionId: 'mission-2',
            description: 'Third challenge',
            toastDescription: 'Third challenge complete.',
            rewardSeeds: 10,
          },
        ],
        missionSetBonusSeedsEarned: 15,
        completedDailyMissionSet: true,
        dailyMissionStreak: 5,
      }),
    });

    expect(toasts).toHaveLength(2);
    expect(toasts[0]).toMatchObject({
      title: 'Mission Complete!',
      detail: "First mission complete. You've earned an extra 5 seeds for your efforts!",
      priority: 60,
    });
    expect(toasts[1]).toMatchObject({
      title: 'Daily Streak Extended!',
      priority: 65,
      lifetimeMs: 5200,
    });
    expect(toasts[1]?.detail).toContain('Your daily streak is now 5 days!');
    expect(toasts[1]?.detail).toContain('Have +15 bonus seeds as a treat.');
    expect(toasts.some((toast) => toast.detail.includes('Third challenge complete.'))).toBe(false);
  });

  it('keeps the standalone daily streak toast when no mission reward toast is present to replace', () => {
    const toasts = buildUnlockToasts({
      isMilestone: false,
      earnedBadgeName: null,
      newThemeUnlockName: null,
      firstGameOfDayBonusSeedsEarned: 0,
      milestoneRewardSeedsEarned: 0,
      roundResult: createRoundResult({
        missionRewards: [],
        missionSetBonusSeedsEarned: 15,
        completedDailyMissionSet: true,
        dailyMissionStreak: 3,
      }),
    });

    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({
      title: 'Daily Streak Extended!',
      priority: 40,
    });
    expect(toasts[0]?.detail).toBe('Your daily streak is now 3 days! Have +15 bonus seeds as a treat.');
  });

  it('leaves mission toasts untouched when the daily streak toast is not present', () => {
    const toasts = buildUnlockToasts({
      isMilestone: false,
      earnedBadgeName: null,
      newThemeUnlockName: null,
      firstGameOfDayBonusSeedsEarned: 0,
      milestoneRewardSeedsEarned: 0,
      roundResult: createRoundResult({
        missionRewards: [
          {
            missionId: 'mission-1',
            description: 'Mission one',
            toastDescription: 'Mission one complete.',
            rewardSeeds: 5,
          },
          {
            missionId: 'mission-2',
            description: 'Mission two',
            toastDescription: 'Mission two complete.',
            rewardSeeds: 10,
          },
        ],
        completedDailyMissionSet: false,
      }),
    });

    expect(toasts).toHaveLength(2);
    expect(toasts[0]?.detail).toContain('Mission one complete.');
    expect(toasts[1]?.detail).toContain('Mission two complete.');
  });
});