const axios = require('axios')

const surnameSelect = async () => {
  try {
    const response = await axios.get(`https://randomuser.me/api/?nat=us,dk,fr,gb,de,es,ca,mx`, { timeout: 8000 }) 
  
    const surname = response.data.results[0].name.last
  
    return surname
  }
  catch (err) {
    console.log('surname call timed out')
    return { error: 'surname call timed out'}
  }
}

module.exports = surnameSelect

