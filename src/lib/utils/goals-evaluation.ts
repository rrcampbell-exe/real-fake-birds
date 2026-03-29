export function isNextStreakEval(
  streakVals: number[],
  currentStreak: number
): number | undefined {
  return streakVals.filter((v) => v > currentStreak)[0];
}

export function isNextMilestoneEval(
  milestoneVals: number[],
  birdsIdentified: number
): number | undefined {
  return milestoneVals.filter((v) => v > birdsIdentified)[0];
}

export function currentStreakGoalEval(
  streakVals: number[],
  currentStreak: number
): number | undefined {
  return streakVals.filter((v) => v === currentStreak)[0];
}

export function currentMilestoneGoalEval(
  milestoneVals: number[],
  birdsIdentified: number
): number | undefined {
  return milestoneVals.filter((v) => v === birdsIdentified)[0];
}
