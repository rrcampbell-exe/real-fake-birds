const axios = require('axios')

const generalAdjectiveSelect = async (birdType) => {
  const validatedBirdType = birdType.substring(birdType.indexOf(' ') + 1);

  const response = await axios.get(`https://api.datamuse.com/words?rel_jjb=${validatedBirdType}`)

  const adjVal = Math.floor(Math.random() * response.data.length)

  const adjective = response.data[adjVal].word
  
  const capitalizedAdj = adjective.charAt(0).toUpperCase() + adjective.slice(1)

  return capitalizedAdj
}

module.exports = generalAdjectiveSelect

