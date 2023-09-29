const axios = require('axios')

const colorSelect = async () => {
  const colorVal = Math.floor(Math.random() * 1000000)
  try {
    const response = await axios.get(`https://www.thecolorapi.com/id?hex=${colorVal}`, { timeout: 8000 })
    
    return response.data.name.value
  }
  catch (err) {
    console.log('color call timed out')
    return { error: 'color call timed out'}
  }
}

module.exports = colorSelect