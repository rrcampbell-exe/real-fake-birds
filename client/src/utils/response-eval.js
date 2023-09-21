import localStorageCheck from './local-storage-check'
import streakValues from '../constants/streak-values';

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

const responseEval = (e, isReal, chosenResponse, setIsCorrect, setIsStreak) => {
  e.preventDefault()

  const hasLocalStorage = localStorageCheck()
  const isCorrect = (isReal && chosenResponse === 'real') || (!isReal && chosenResponse === 'fake')
  if (isCorrect) setIsCorrect(true)

  if (!hasLocalStorage) {
    const birdScore = {
      birdsSeen: 0,
      birdsIdentified: 0,
      currentStreak: 0,
      justAchievedStreak: false
    }
    localStorage.setItem('birdScore', JSON.stringify(birdScore))
  }

  if (isCorrect) {
    const birdScore = JSON.parse(localStorage.getItem('birdScore'))
    let { birdsSeen, birdsIdentified, currentStreak, justAchievedStreak } = birdScore

    birdsSeen = birdsSeen + 1
    birdsIdentified = birdsIdentified + 1
    currentStreak = currentStreak + 1
    
    const updatedBirdScore = {
      birdsSeen,
      birdsIdentified,
      currentStreak,
      justAchievedStreak
    }

    localStorage.setItem('birdScore', JSON.stringify(updatedBirdScore))

    streakEval(updatedBirdScore.currentStreak, setIsStreak)
    
    return
  }

  const birdScore = JSON.parse(localStorage.getItem('birdScore'))
  let { birdsSeen, birdsIdentified, currentStreak } = birdScore

  birdsSeen = birdsSeen + 1
  currentStreak = 0
  
  const updatedBirdScore = {
    birdsSeen,
    birdsIdentified,
    currentStreak
  }

  localStorage.setItem('birdScore', JSON.stringify(updatedBirdScore))
}

export default responseEval
