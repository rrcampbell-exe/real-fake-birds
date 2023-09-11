import { useEffect, useState } from 'react'
import axios from 'axios'
import AnswerModal from '../Modal'

const BirdName = () => {
  const [birdData, setBirdData] = useState('')
  const [isReal, setIsReal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const response = await axios.get('http://localhost:3001/')
      setBirdData(response.data.birdName)
      setIsReal(response.data.isReal)
      console.log(response.data.isReal ? 'bird is real' : 'bird is fake')
      setIsLoading(false)
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

  if (isLoading) return 'loading'
  return (
  <>
    <h1>{birdData}</h1>
    <button id='real' onClick={(e) => responseEval(e, isReal, e.target.id)}>Real Bird</button>
    <button id='fake' onClick={(e) => responseEval(e, isReal, e.target.id)}>Fake Bird</button>
    <AnswerModal
      isOpen={isModalOpen}
      birdData={birdData}
      isReal={isReal}
      isCorrect={isCorrect}
    />
  </>
  )
}

export default BirdName
