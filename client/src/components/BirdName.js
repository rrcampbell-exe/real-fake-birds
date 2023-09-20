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

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
`

const BirdName = () => {
  const [birdData, setBirdData] = useState('')
  const [isReal, setIsReal] = useState(false)
  const [isAnswerVisible, setIsAnswerVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isCorrect, setIsCorrect] = useState(false)

  useEffect(() => {
    fetchData(setIsReal, setIsLoading, setBirdData)
  }, [])

  return (
    <BirdNameContainer>
      {isLoading && <LoadingState />}
      {!isAnswerVisible && <h1>{birdData}</h1>}
      {isAnswerVisible &&
        <Answer
          birdData={birdData}
          isReal={isReal}
          isCorrect={isCorrect}
        />
      }
      {!isLoading &&
        <ButtonContainer>
          {!isAnswerVisible &&
            <>
              <button id='real' onClick={(e) => { responseEval(e, isReal, e.target.id, setIsCorrect); setIsAnswerVisible(true) }}>Real Bird</button>
              <button id='fake' onClick={(e) => { responseEval(e, isReal, e.target.id, setIsCorrect); setIsAnswerVisible(true) }}>Fake Bird</button>
            </>
          }
          {isAnswerVisible && <button onClick={() => window.location.reload(true)}>Try Again</button>}
        </ButtonContainer>
      }
    </BirdNameContainer>
  )
}

export default BirdName
