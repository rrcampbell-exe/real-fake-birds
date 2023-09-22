import React, { useEffect } from 'react'
import styled from 'styled-components'
import ConfettiGenerator from 'confetti-js'
import correctnessText from '../utils/correctness-text'

const AnswerText = styled.h2`
  margin: 1rem;
  @media (min-width: 600px) {
    font-size: 2rem;
  }
`

const RealFakeText = styled.span`
  color: #3f1212;
`

const Answer = ({ birdData, isReal, isStreak, isCorrect, isMilestone }) => {
  useEffect(() => {
    const confettiSettings = { target: 'confetti-canvas' };
    const confetti = new ConfettiGenerator(confettiSettings);
    (isStreak || isMilestone) && confetti.render();
    
    return () => confetti.clear();
  }, [isStreak, isMilestone])
  
  return (
    <div>
      <p>{correctnessText(isCorrect, isStreak, isMilestone)}</p>
      <AnswerText>The {birdData} is a <RealFakeText>{isReal ? 'real' : 'fake'}</RealFakeText> bird.</AnswerText>
      <button onClick={() => { localStorage.setItem('birdStreakAchieved', false); localStorage.setItem('birdMilestoneAchieved', false); window.location.reload(true) }}>Try Again</button>
    </div>
  )
}

export default Answer
