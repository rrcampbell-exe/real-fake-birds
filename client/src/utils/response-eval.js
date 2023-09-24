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

const milestoneEval = (currentMilestone, setIsMilestone) => {
  for (const value of milestoneValues) {
    if (currentMilestone === value) {
      setIsMilestone(true)
      localStorage.setItem('birdMilestoneAchieved', true)
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
