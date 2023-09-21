const correctnessText = (isCorrect, isStreak) => {
  const { currentStreak } = JSON.parse(localStorage.getItem('birdScore'))
  if (isStreak && currentStreak !== 2) {
    return `That's ${currentStreak} correct in a row! 🦅`
  }
  if (isStreak) {
    return 'New streak! 🐣'
  }
  if (isCorrect) {
    return 'Correct! 👏'
  }
  return 'Incorrect. 😬'
}

export default correctnessText
