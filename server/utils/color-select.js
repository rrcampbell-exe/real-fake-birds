const axios = require('axios')

const colorSelect = async () => {
  const colorVal = Math.floor(Math.random() * 1000000)
  const response = await axios.get(`https://www.thecolorapi.com/id?hex=${colorVal}`)
  
  return response.data.name.value
}

module.exports = colorSelect