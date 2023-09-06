import { useEffect, useState } from 'react'
import axios from 'axios'
import AnswerModal from '../Modal'

const responseEval = (isReal, chosenResponse) => {
  // TODO: replace alerts with modal
  if (isReal && chosenResponse === 'real') {
    alert('Correct!')
    return
  }
  if (!isReal && chosenResponse === 'fake') {
    alert('Correct!')
    return
  }
  alert('Wrong!')
}

const BirdName = () => {
  const [birdData, setBirdData] = useState('')
  const [isReal, setIsReal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

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

  if (isLoading) return 'loading'
  return (
  <>
    <h1>{birdData}</h1>
    <button id='real' onClick={(e) => responseEval(isReal, e.target.id)}>Real Bird</button>
    <button id='fake' onClick={(e) => responseEval(isReal, e.target.id)}>Fake Bird</button>
    <button onClick={() => setIsModalOpen(true)}>Try Again</button>
    <AnswerModal
      isOpen={isModalOpen}
    />
  </>
  )
}

export default BirdName
