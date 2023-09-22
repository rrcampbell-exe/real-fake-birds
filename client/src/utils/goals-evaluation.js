export const isNextStreakEval = (streakValues, currentStreak) => {
  const areAvailableStreaks = (streakValues) => streakValues > currentStreak
  return streakValues.filter(areAvailableStreaks)[0]
}

export const isNextMilestoneEval = (milestoneValues, birdsIdentified) => {
  const areAvailableMilestones = (milestoneValues) => milestoneValues > birdsIdentified
  return milestoneValues.filter(areAvailableMilestones)[0]
}

export const currentStreakGoalEval = (streakValues, currentStreak) => {
  const currentStreakGoal = (streakValues) => streakValues === currentStreak
  return streakValues.filter(currentStreakGoal)[0]
}

export const currentMilestoneGoalEval = (milestoneValues, birdsIdentified) => {
  const currentMilestoneGoal = (milestoneValues) => milestoneValues === birdsIdentified
  return milestoneValues.filter(currentMilestoneGoal)[0]
}
