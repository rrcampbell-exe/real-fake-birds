import { localStorageCheck } from './local-storage-check';
import { streakValues } from '../constants/streaks';
import { milestones } from '../constants/milestones';
import type { BirdScore } from '@/types';

const streakEval = (
  currentStreak: number,
  setIsStreak: (val: boolean) => void
) => {
  for (const value of streakValues) {
    if (currentStreak === value) {
      setIsStreak(true);
      localStorage.setItem('birdStreakAchieved', 'true');
      return;
    }
    setIsStreak(false);
  }
};

const updateMilestonesArray = (
  allMilestonesAchieved: typeof milestones
) => {
  if (localStorage.getItem('birdMilestonesArray')) {
    localStorage.removeItem('birdMilestonesArray');
  }
  return allMilestonesAchieved;
};

const milestoneEval = (
  currentMilestone: number,
  setIsMilestone: (val: boolean) => void
) => {
  for (const milestone of milestones) {
    if (currentMilestone === milestone.value) {
      setIsMilestone(true);
      localStorage.setItem('birdMilestoneAchieved', 'true');
      localStorage.setItem('hasUnseenBadges', 'true');

      const allMilestonesAchieved = milestones.filter(
        (m) => m.value <= currentMilestone
      );

      const milestonesArray = JSON.stringify(
        updateMilestonesArray(allMilestonesAchieved)
      );

      localStorage.setItem('birdMilestonesArray', milestonesArray);

      return;
    }
    setIsMilestone(false);
  }
};

const responseEval = (
  e: React.FormEvent,
  isReal: boolean,
  chosenResponse: 'real' | 'fake',
  setIsCorrect: (val: boolean) => void,
  setIsStreak: (val: boolean) => void,
  setIsMilestone: (val: boolean) => void
) => {
  e.preventDefault();

  const hasLocalStorage = localStorageCheck();
  const isCorrect =
    (isReal && chosenResponse === 'real') ||
    (!isReal && chosenResponse === 'fake');
  if (isCorrect) setIsCorrect(true);

  if (!hasLocalStorage) {
    const birdScore: BirdScore = {
      birdsSeen: 0,
      birdsIdentified: 0,
      currentStreak: 0,
      justAchievedStreak: false,
      bestStreak: 0,
    };
    localStorage.setItem('birdScore', JSON.stringify(birdScore));
  }

  if (isCorrect) {
    const birdScore: BirdScore = JSON.parse(
      localStorage.getItem('birdScore')!
    );
    let { birdsSeen, birdsIdentified, currentStreak, bestStreak } = birdScore;
    const { justAchievedStreak } = birdScore;

    birdsSeen = birdsSeen + 1;
    birdsIdentified = birdsIdentified + 1;
    currentStreak = currentStreak + 1;
    bestStreak = currentStreak > bestStreak ? currentStreak : bestStreak;

    const updatedBirdScore: BirdScore = {
      birdsSeen,
      birdsIdentified,
      currentStreak,
      justAchievedStreak,
      bestStreak,
    };

    localStorage.setItem('birdScore', JSON.stringify(updatedBirdScore));

    streakEval(updatedBirdScore.currentStreak, setIsStreak);
    milestoneEval(updatedBirdScore.birdsIdentified, setIsMilestone);

    return;
  }

  const birdScore: BirdScore = JSON.parse(
    localStorage.getItem('birdScore')!
  );
  let { birdsSeen } = birdScore;
  const { bestStreak } = birdScore;
  const { birdsIdentified } = birdScore;

  birdsSeen = birdsSeen + 1;

  const updatedBirdScore: BirdScore = {
    birdsSeen,
    birdsIdentified,
    currentStreak: 0,
    bestStreak,
    justAchievedStreak: false,
  };

  localStorage.setItem('birdScore', JSON.stringify(updatedBirdScore));
};

export default responseEval;
