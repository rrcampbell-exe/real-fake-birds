import React from 'react'
import styled from 'styled-components'

const AnswerContainer = styled.div`
  display: flex;
  flex-direction: row;
  margin: 0 2rem;
  justify-content: center;
`

const RealFakeText = styled.span`
  color: #5C1B1B;
`

const Answer = ({ birdData, isReal }) => {
  return (
    <AnswerContainer>
      <h1>The {birdData} is a <RealFakeText>{isReal ? 'real' : 'fake'}</RealFakeText> bird.</h1>
    </AnswerContainer>
  )
}

export default Answer
