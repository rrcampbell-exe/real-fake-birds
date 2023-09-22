import { useEffect, useState } from 'react'
import LoadingState from './LoadingState'
import Answer from './Answer'
import Error from'./Error'
import styled from 'styled-components'
import responseEval from '../utils/response-eval'
import fetchData from '../utils/fetch-data'
import Scoreboard from './Scoreboard'

const BirdNameContainer = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  width: 100%;
  transform: translate(-50%, -50%);
  color: white;
  text-align: center;
`

const BirdName = styled.h2`
  margin: 1rem;
  @media (min-width: 600px) {
    font-size: 2rem;
  }
`

const BirdNameSection = () => {
  const [birdData, setBirdData] = useState('')
  const [isReal, setIsReal] = useState(false)
  const [isAnswerVisible, setIsAnswerVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [isStreak, setIsStreak] = useState(false)
  const [isMilestone, setIsMilestone] = useState(false)

  useEffect(() => {
    fetchData(setIsReal, setIsLoading, setBirdData, setIsError)
  }, [])

  const displayBirdData = !isAnswerVisible && !isError && !isLoading

  return (
    <>
      <BirdNameContainer>
        {isError && <Error />}
        {isLoading && <LoadingState />}
        {displayBirdData &&
          <>
            <BirdName>{birdData}</BirdName>
            <button id='real' onClick={(e) => { responseEval(e, isReal, e.target.id, setIsCorrect, setIsStreak, setIsMilestone); setIsAnswerVisible(true) }}>Real Bird</button>
            <button id='fake' onClick={(e) => { responseEval(e, isReal, e.target.id, setIsCorrect, setIsStreak, setIsMilestone); setIsAnswerVisible(true) }}>Fake Bird</button>
          </>
        }
        {isAnswerVisible &&
          <Answer
            birdData={birdData}
            isReal={isReal}
            isStreak={isStreak}
            isCorrect={isCorrect}
            isMilestone={isMilestone}
          />
        }
      </BirdNameContainer>
      {localStorage.getItem('birdScore') && <Scoreboard />}
    </>
  )
}

export default BirdNameSection
