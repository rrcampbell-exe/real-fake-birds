import { useEffect, useState } from 'react'
import axios from 'axios'
import AnswerModal from '../Modal'
import LoadingState from '../LoadingState'
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
  justify-content: space-around;
`


const BirdName = () => {
  const [birdData, setBirdData] = useState('')
  const [isReal, setIsReal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const response = await axios.get('http://localhost:3001/')
      setIsReal(response.data.isReal)
      setTimeout(() => setIsLoading(false), 2000)
      setTimeout(() => setBirdData(response.data.birdName), 2000)
    }
    fetchData()
  }, [])

  const responseEval = (e, isReal, chosenResponse) => {
    // TODO: refactor for simplicity, as both if statements run same functions
    e.preventDefault()
    if (isReal && chosenResponse === 'real') {
      setIsModalOpen(true)
      setIsCorrect(true)
      return
    }
    if (!isReal && chosenResponse === 'fake') {
      setIsModalOpen(true)
      setIsCorrect(true)
      return
    }
    setIsModalOpen(true)
  }

  return (
  <BirdNameContainer>
    {isLoading && <LoadingState />}
    <h1>{birdData}</h1>
    {!isLoading &&
      <ButtonContainer>
        <button id='real' onClick={(e) => responseEval(e, isReal, e.target.id)}>Real Bird</button>
        <button id='fake' onClick={(e) => responseEval(e, isReal, e.target.id)}>Fake Bird</button>
      </ButtonContainer>
    }
    <AnswerModal
      isOpen={isModalOpen}
      birdData={birdData}
      isReal={isReal}
      isCorrect={isCorrect}
    />
  </BirdNameContainer>
  )
}

export default BirdName
