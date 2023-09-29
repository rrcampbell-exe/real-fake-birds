const axios = require('axios')

const generalAdjectiveSelect = async (birdType) => {
  const validatedBirdType = birdType.substring(birdType.indexOf(' ') + 1);

  try {
    const response = await axios.get(`https://api.datamuse.com/words?rel_jjb=${validatedBirdType}`, { timeout: 8000 })
    const adjVal = Math.floor(Math.random() * response.data.length)

    const adjective = response.data[adjVal].word
    
    const capitalizedAdj = adjective.charAt(0).toUpperCase() + adjective.slice(1)
  
    return capitalizedAdj
  }
  catch (err) {
    console.log('adjective call timed out')
    return { error: 'adjective call timed out'}
  }
}

module.exports = generalAdjectiveSelect

