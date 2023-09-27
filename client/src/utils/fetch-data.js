import axios from 'axios'

const fetchData = async (setIsReal, setIsLoading, setBirdData, setIsError) => {

  if (JSON.parse(localStorage.getItem('birdData'))) {
    const { birdName, isReal } = JSON.parse(localStorage.getItem('birdData'))
    setIsReal(isReal)
    setTimeout(() => setIsLoading(false), 1000)
    setTimeout(() => setBirdData(birdName), 1000)
    return
  }

  const url = process.env.NODE_ENV === 'development' ? 'http://localhost:3001/' : 'https://real-fake-birds-server.vercel.app/'
  const response = await axios.get(url)
  
  if (response.data.error) {
    setIsError(true)
    setIsLoading(false)
    return
  }

  const birdData = {
    birdName: response.data.birdName,
    isReal: response.data.isReal
  }
  localStorage.setItem('birdData', JSON.stringify(birdData))

  setIsReal(response.data.isReal)
  setTimeout(() => setIsLoading(false), 1000)
  setTimeout(() => setBirdData(response.data.birdName), 1000)
}

export default fetchData
