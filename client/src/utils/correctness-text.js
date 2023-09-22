const correctnessText = (isCorrect, isStreak, isMilestone) => {
  const { currentStreak, birdsIdentified } = JSON.parse(localStorage.getItem('birdScore'))

  const milestoneAddedText = isMilestone ? ` and ${birdsIdentified} birds you've now identified successfully` : ''

  if (isStreak && currentStreak !== 2) {
    return `That's ${currentStreak} correct in a row${milestoneAddedText}! 🦅`
  }
  if (isMilestone) {
    return `Wow! You've correctly identified real fake birds ${birdsIdentified} times! 🐧`
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
