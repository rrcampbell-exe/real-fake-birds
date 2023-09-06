const axios = require('axios')

const surnameSelect = async () => {
  const response = await axios.get(`https://randomuser.me/api/?nat=us,dk,fr,gb,de,es,ca,mx`) 

  const surname = response.data.results[0].name.last

  return surname
}

module.exports = surnameSelect

