import localStorageCheck from './local-storage-check'

const streakEval = (currentStreak, setIsStreak) => {
  switch (currentStreak) {
    case 1:
    case 5:
    case 10:
    case 25:
    case 50:
    case 100:
    case 200:
    case 300:
    case 400:
    case 500:
      setIsStreak(true)
      break;
    default:
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
      currentStreak: 0
    }
    localStorage.setItem('birdScore', JSON.stringify(birdScore))
  }

  if (isCorrect) {
    const birdScore = JSON.parse(localStorage.getItem('birdScore'))
    let { birdsSeen, birdsIdentified, currentStreak } = birdScore

    birdsSeen = birdsSeen + 1
    birdsIdentified = birdsIdentified + 1
    currentStreak = currentStreak + 1
    
    const updatedBirdScore = {
      birdsSeen,
      birdsIdentified,
      currentStreak
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
