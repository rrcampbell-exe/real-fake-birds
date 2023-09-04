const axios = require('axios')

const colorSelect = async () => {
  const colorVal = Math.floor(Math.random() * 1000000)
  const response = await axios.get(`https://www.thecolorapi.com/id?hex=${colorVal}`)
  
  // TODO: filter out any colors with spaces in them, run again
  return response.data.name.value
}

module.exports = colorSelect