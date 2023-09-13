import { useEffect, useState } from 'react'
import axios from 'axios'
import LoadingState from './LoadingState'
import Answer from './Answer'
import styled from 'styled-components'

const BirdNameContainer = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  bottom: auto;
  right: auto;
  margin-right: -50%;
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

  useEffect(() => {
    const fetchData = async () => {
      const response = await axios.get('http://localhost:3001/')
      setIsReal(response.data.isReal)
      setTimeout(() => setIsLoading(false), 2000)
      setTimeout(() => setBirdData(response.data.birdName), 2000)
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
              <button id='real' onClick={() => setIsAnswerVisible(true)}>Real Bird</button>
              <button id='fake' onClick={() => setIsAnswerVisible(true)}>Fake Bird</button>
            </>
          }
          {isAnswerVisible && <button onClick={() => window.location.reload(true)}>Try Again</button>}
        </ButtonContainer>
      }
    </BirdNameContainer>
  )
}

export default BirdName
