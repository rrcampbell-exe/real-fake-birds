import localStorageCheck from './local-storage-check'
import streakValues from '../constants/streak-values';
import milestoneValues from '../constants/milestone-values';

const streakEval = (currentStreak, setIsStreak) => {
  for (const value of streakValues) {
    if (currentStreak === value) {
      setIsStreak(true)
      localStorage.setItem('birdStreakAchieved', true)
      return
    }
    setIsStreak(false)
  }
}

const updateMilestonesArray = (currentMilestoneAchieved, allMilestonesAchieved) => {
  if (localStorage.getItem('birdMilestonesArray')) {
    let milestonesArray = JSON.parse(localStorage.getItem('birdMilestonesArray'))
    milestonesArray.push(currentMilestoneAchieved)
    return milestonesArray
  } else {
    return allMilestonesAchieved
  }
}

const milestoneEval = (currentMilestone, setIsMilestone) => {
  for (const milestone of milestoneValues) {
    if (currentMilestone === milestone.value) {
      setIsMilestone(true)
      localStorage.setItem('birdMilestoneAchieved', true)
      localStorage.setItem('hasUnseenBadges', true)

      const allMilestonesAchieved = milestoneValues.filter((milestone) => milestone.value <= currentMilestone)
      const currentMilestoneAchieved = milestoneValues.filter((milestone) => milestone.value === currentMilestone)[0]
      
      const milestonesArray = JSON.stringify(updateMilestonesArray(currentMilestoneAchieved, allMilestonesAchieved))
      
      localStorage.setItem('birdMilestonesArray', milestonesArray)

      return
    }
    setIsMilestone(false)
  }
}

const responseEval = (e, isReal, chosenResponse, setIsCorrect, setIsStreak, setIsMilestone) => {
  e.preventDefault()

  const hasLocalStorage = localStorageCheck()
  const isCorrect = (isReal && chosenResponse === 'real') || (!isReal && chosenResponse === 'fake')
  if (isCorrect) setIsCorrect(true)

  if (!hasLocalStorage) {
    const birdScore = {
      birdsSeen: 0,
      birdsIdentified: 0,
      currentStreak: 0,
      justAchievedStreak: false,
      bestStreak: 0
    }
    localStorage.setItem('birdScore', JSON.stringify(birdScore))
  }

  if (isCorrect) {
    const birdScore = JSON.parse(localStorage.getItem('birdScore'))
    let { birdsSeen, birdsIdentified, currentStreak, justAchievedStreak, bestStreak } = birdScore

    // patch to address bug that arose in upversioning game in early days
    // can be removed in early 2024
    if (!bestStreak) bestStreak = currentStreak

    birdsSeen = birdsSeen + 1
    birdsIdentified = birdsIdentified + 1
    currentStreak = currentStreak + 1
    bestStreak = currentStreak > bestStreak ? bestStreak + 1 : bestStreak
    
    const updatedBirdScore = {
      birdsSeen,
      birdsIdentified,
      currentStreak,
      justAchievedStreak,
      bestStreak
    }

    localStorage.setItem('birdScore', JSON.stringify(updatedBirdScore))

    streakEval(updatedBirdScore.currentStreak, setIsStreak)
    milestoneEval(updatedBirdScore.birdsIdentified, setIsMilestone)
    
    return
  }

  const birdScore = JSON.parse(localStorage.getItem('birdScore'))
  let { birdsSeen, birdsIdentified, currentStreak, bestStreak } = birdScore

  // patch to address bug that arose in upversioning game in early days
  // can be removed in early 2024
  if (!bestStreak) bestStreak = currentStreak

  birdsSeen = birdsSeen + 1
  currentStreak = 0
  
  const updatedBirdScore = {
    birdsSeen,
    birdsIdentified,
    currentStreak,
    bestStreak
  }

  localStorage.setItem('birdScore', JSON.stringify(updatedBirdScore))
}

export default responseEval
