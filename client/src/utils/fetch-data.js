import axios from 'axios'

const fetchData = async (setIsReal, setIsLoading, setBirdData) => {
  const url = process.env.NODE_ENV === 'development' ? 'http://localhost:3001/' : 'https://real-fake-birds-server.vercel.app/'
  const response = await axios.get(url) 
  setIsReal(response.data.isReal)
  setTimeout(() => setIsLoading(false), 1000)
  setTimeout(() => setBirdData(response.data.birdName), 1000)
}

export default fetchData
