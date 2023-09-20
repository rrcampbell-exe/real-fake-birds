import { useEffect, useState } from 'react'
import LoadingState from './LoadingState'
import Answer from './Answer'
import styled from 'styled-components'
import responseEval from '../utils/response-eval'
import fetchData from '../utils/fetch-data'

const BirdNameContainer = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  width: 100%;
  transform: translate(-50%, -50%);
  color: white;
  text-align: center;
`

const BirdName = () => {
  const [birdData, setBirdData] = useState('')
  const [isReal, setIsReal] = useState(false)
  const [isAnswerVisible, setIsAnswerVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isCorrect, setIsCorrect] = useState(false)
  const [isStreak, setIsStreak] = useState(false)

  useEffect(() => {
    fetchData(setIsReal, setIsLoading, setBirdData)
  }, [])

  const correctnessText = (isCorrect, isStreak) => {
    const { currentStreak } = JSON.parse(localStorage.getItem('birdScore'))
    if (isStreak && currentStreak !== 1) {
      return `That's ${currentStreak} in a row! 🦅`
    }
    if (isStreak) {
      return 'New streak! 🐣'
    }
    if (isCorrect) {
      return 'Correct! 👏'
    }
    return 'Incorrect. 😬'
  }

  return (
    <BirdNameContainer>
      {isLoading && <LoadingState />}
      {!isAnswerVisible && <h1>{birdData}</h1>}
      {isAnswerVisible &&
        <Answer
          birdData={birdData}
          isReal={isReal}
          isStreak={isStreak}
        />
      }
      {!isLoading &&
        <div>
          {!isAnswerVisible &&
            <>
              <button id='real' onClick={(e) => { responseEval(e, isReal, e.target.id, setIsCorrect, setIsStreak); setIsAnswerVisible(true) }}>Real Bird</button>
              <button id='fake' onClick={(e) => { responseEval(e, isReal, e.target.id, setIsCorrect, setIsStreak); setIsAnswerVisible(true) }}>Fake Bird</button>
            </>
          }
          {isAnswerVisible &&
            <>
              <p>{correctnessText(isCorrect, isStreak)}</p>
              <button onClick={() => window.location.reload(true)}>Try Again</button>
            </>
          }
        </div>
      }
    </BirdNameContainer>
  )
}

export default BirdName
