import localStorageCheck from './local-storage-check'

const responseEval = (e, isReal, chosenResponse, setIsCorrect) => {
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
