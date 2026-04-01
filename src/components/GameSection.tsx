'use client';

import { useGameState } from '@/hooks/useGameState';
import BirdCard from './game/BirdCard';
import LoadingState from './LoadingState';
import Answer from './Answer';
import Error from './Error';
import StatsBar from '@/components/StatsBar';

export default function GameSection() {
  const {
    birdData,
    isReal,
    hasAnswered,
    isLoading,
    isError,
    isCorrect,
    isStreak,
    isMilestone,
    seedsEarned,
    newThemeUnlockName,
    earnedBadgeName,
    showQuestion,
    handleAnswer,
    tryAgain,
  } = useGameState();

  const cardState = isLoading ? 'loading' : showQuestion ? 'question' : 'answer';

  return (
    <div className="box-border flex min-h-[calc(100dvh-7rem)] flex-1 flex-col items-center justify-center gap-6 py-6 md:min-h-0 md:py-4">
      {/* Title + slogan — visible only on mobile (desktop shows it in TopNav) */}
      <div className="text-center px-4 md:hidden">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[0.05em]">
          Real Fake Birds
        </h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          Some are real. Some are fake. Tell them apart.
        </p>
      </div>

      <StatsBar refreshTrigger={hasAnswered} />

      {isError && <Error onTryAgain={tryAgain} />}

      {!isError && (
        <BirdCard
          birdName={birdData}
          state={cardState}
          onAnswer={handleAnswer}
          loadingContent={<LoadingState />}
          answerContent={
            <Answer
              birdData={birdData}
              isReal={isReal}
              isStreak={isStreak}
              isCorrect={isCorrect}
              isMilestone={isMilestone}
              seedsEarned={seedsEarned}
              newThemeUnlockName={newThemeUnlockName}
              earnedBadgeName={earnedBadgeName}
              onTryAgain={tryAgain}
            />
          }
        />
      )}
    </div>
  );
}
