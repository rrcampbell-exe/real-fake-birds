import React, { useEffect } from 'react'
import styled from 'styled-components'
import ConfettiGenerator from 'confetti-js'

const AnswerContainer = styled.div`
  display: flex;
  flex-direction: row;
  margin: 0 2rem;
  justify-content: center;
`

const RealFakeText = styled.span`
  color: #3f1212;
`

const Answer = ({ birdData, isReal, isStreak }) => {
  useEffect(() => {
    const confettiSettings = { target: 'confetti-canvas' };
    const confetti = new ConfettiGenerator(confettiSettings);
    isStreak && confetti.render();
    
    return () => confetti.clear();
  }, [isStreak])
  return (
    <AnswerContainer>
      <h1>The {birdData} is a <RealFakeText>{isReal ? 'real' : 'fake'}</RealFakeText> bird.</h1>
    </AnswerContainer>
  )
}

export default Answer
