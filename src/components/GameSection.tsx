'use client';

import { useCallback, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useGameState } from '@/hooks/useGameState';
import { useSignUpPrompt } from '@/hooks/useSignUpPrompt';
import WeeklyChallengeBanner from '@/components/WeeklyChallengeBanner';
import BirdCard from './game/BirdCard';
import LoadingState from './LoadingState';
import Answer from './Answer';
import Error from './Error';
import StatsBar from '@/components/StatsBar';
import SignUpPromptModal from '@/components/auth/SignUpPromptModal';

export default function GameSection() {
  const {
    birdData,
    isReal,
    regionLabel,
    sciName,
    fact,
    hasAnswered,
    isLoading,
    isError,
    isCorrect,
    isStreak,
    isMilestone,
    seedsEarned,
    newThemeUnlockName,
    earnedBadgeName,
    isNewBirdEncounter,
    hints,
    hintError,
    hintErrorType,
    hintLoading,
    seedsBalance,
    specialHintAction,
    showQuestion,
    handleAnswer,
    requestHint,
    tryAgain,
  } = useGameState();
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const signUpPrompt = useSignUpPrompt('classic');

  const cardState = isLoading ? 'loading' : showQuestion ? 'question' : 'answer';

  const handleAdvanceRound = useCallback(() => {
    if (signUpPrompt.shouldPrompt && signUpPrompt.activeThreshold !== null) {
      setShowSignUpModal(true);
      return;
    }

    tryAgain();
  }, [signUpPrompt.activeThreshold, signUpPrompt.shouldPrompt, tryAgain]);

  const handleDismissSignUpModal = useCallback(() => {
    signUpPrompt.dismiss();
    setShowSignUpModal(false);
    tryAgain();
  }, [signUpPrompt, tryAgain]);

  const handleAuthenticated = useCallback(() => {
    signUpPrompt.onAccountCreated();
    setShowSignUpModal(false);
    tryAgain();
  }, [signUpPrompt, tryAgain]);

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

      <WeeklyChallengeBanner />

      {isError && <Error onTryAgain={tryAgain} />}

      {!isError && (
        <BirdCard
          birdName={birdData}
          hintError={hintError}
          hintErrorType={hintErrorType}
          hintLoading={hintLoading}
          hints={hints}
          onRequestHint={requestHint}
          specialHintAction={specialHintAction}
          state={cardState}
          seedsBalance={seedsBalance}
          onAnswer={handleAnswer}
          loadingContent={<LoadingState />}
          answerContent={
            <Answer
              birdData={birdData}
              isReal={isReal}
              regionLabel={regionLabel}
              sciName={sciName}
              fact={fact}
              hints={hints}
              isStreak={isStreak}
              isCorrect={isCorrect}
              isMilestone={isMilestone}
              seedsEarned={seedsEarned}
              newThemeUnlockName={newThemeUnlockName}
              earnedBadgeName={earnedBadgeName}
              isNewBirdEncounter={isNewBirdEncounter}
              onAction={handleAdvanceRound}
            />
          }
        />
      )}

      <AnimatePresence>
        {showSignUpModal && signUpPrompt.activeThreshold !== null ? (
          <SignUpPromptModal
            birdsSeen={signUpPrompt.birdsSeen}
            birdsIdentified={signUpPrompt.birdsIdentified}
            seeds={signUpPrompt.seeds}
            threshold={signUpPrompt.activeThreshold}
            onDismiss={handleDismissSignUpModal}
            onAuthenticated={handleAuthenticated}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
