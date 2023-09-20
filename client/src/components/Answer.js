import React, { useEffect } from 'react'
import styled from 'styled-components'
import ConfettiGenerator from 'confetti-js'
import correctnessText from '../utils/correctness-text'

const RealFakeText = styled.span`
  color: #3f1212;
`

const Answer = ({ birdData, isReal, isStreak, isCorrect }) => {
  useEffect(() => {
    const confettiSettings = { target: 'confetti-canvas' };
    const confetti = new ConfettiGenerator(confettiSettings);
    isStreak && confetti.render();
    
    return () => confetti.clear();
  }, [isStreak])
  return (
    <div>
      <h1>The {birdData} is a <RealFakeText>{isReal ? 'real' : 'fake'}</RealFakeText> bird.</h1>
      <p>{correctnessText(isCorrect, isStreak)}</p>
      <button onClick={() => window.location.reload(true)}>Try Again</button>
    </div>
  )
}

export default Answer
