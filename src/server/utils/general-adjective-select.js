const axios = require('axios')

const generalAdjectiveSelect = async () => {
  const response = await axios.get(`https://api.datamuse.com/words?rel_jjb=bird`) // TODO: consider updating search value from 'bird' to include additional possibilities

  const adjVal = Math.floor(Math.random() * response.data.length)

  const adjective = response.data[adjVal].word
  
  const capitalizedAdj = adjective.charAt(0).toUpperCase() + adjective.slice(1)

  return capitalizedAdj
}

module.exports = generalAdjectiveSelect

