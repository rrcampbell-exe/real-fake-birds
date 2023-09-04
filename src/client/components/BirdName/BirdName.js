import { useEffect, useState } from 'react'
import axios from 'axios'

const BirdName = () => {
  const [birdData, setBirdData] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const response = await axios.get('http://localhost:3001/')
      setBirdData(response.data)
      setIsLoading(false)
    }
    fetchData()
  }, [])

  if (isLoading) return 'loading'
  return (
  <>
    <h1>{birdData}</h1>
  </>
  )
}

export default BirdName
