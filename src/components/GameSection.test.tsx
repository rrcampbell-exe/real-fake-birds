import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameSection from './GameSection';

vi.mock('@/hooks/useGameState', () => ({
  useGameState: vi.fn(),
}));

vi.mock('@/hooks/useSignUpPrompt', () => ({
  useSignUpPrompt: vi.fn(),
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

const mockedUseGameState = vi.mocked(useGameState);
const mockedUseSignUpPrompt = vi.mocked(useSignUpPrompt);

function createGameState(overrides: Partial<ReturnType<typeof useGameState>> = {}) {
  return {
    birdData: 'Silver Finch',
    earnedBadgeName: null,
    fact: null,
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
    expect(screen.queryByText(/^Theme Unlocked!$/i)).not.toBeInTheDocument();
  });
});