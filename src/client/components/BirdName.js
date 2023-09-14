import { useEffect, useState } from 'react'
import axios from 'axios'
import LoadingState from './LoadingState'
import Answer from './Answer'
import styled from 'styled-components'
import responseEval from '../utils/response-eval'

const BirdNameContainer = styled.div`
  margin-top: 5rem;
  display: flex;
  flex-direction: column;
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

  useEffect(() => {
    const fetchData = async () => {
      const response = await axios.get('http://localhost:3001/')
      setIsReal(response.data.isReal)
      setTimeout(() => setIsLoading(false), 1000)
      setTimeout(() => setBirdData(response.data.birdName), 1000)
    }
    fetchData()
  }, [])

  return (
    <BirdNameContainer>
      {isLoading && <LoadingState />}
      {!isAnswerVisible && <h1>{birdData}</h1>}
      {isAnswerVisible &&
        <Answer
          birdData={birdData}
          isReal={isReal}
        />
      }
      {!isLoading &&
        <ButtonContainer>
          {!isAnswerVisible &&
            <>
              <button id='real' onClick={(e) => { responseEval(e, isReal, e.target.id); setIsAnswerVisible(true) }}>Real Bird</button>
              <button id='fake' onClick={(e) => { responseEval(e, isReal, e.target.id); setIsAnswerVisible(true) }}>Fake Bird</button>
            </>
          }
          {isAnswerVisible && <button onClick={() => window.location.reload(true)}>Try Again</button>}
        </ButtonContainer>
      }
    </BirdNameContainer>
  )
}

export default BirdName