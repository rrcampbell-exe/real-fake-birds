const router = require('express').Router();
const API_KEY = process.env.REACT_APP_API_KEY
const nameGenerator = require('../utils/name-generator')
const locations = require('../constants/locations')
const percentOfTime = require('../utils/percent-of-time')

const selectLocation = () => {
  const locationVal = (Math.floor(Math.random() * locations.length))
  const { alpha2code } = locations[locationVal]
  return alpha2code
}

const options = {
  headers: {
    'X-eBirdApiToken': API_KEY
  },
  method: 'GET',
  redirect: 'follow'
};

const birdCall = async (url, options) => {
  const fakeBird = percentOfTime(47)
  if (fakeBird) {
    return nameGenerator()
  }
  const response = await fetch(url, options)
    .then(response => {
      return response.json()
    })
    .catch(error => console.log('error', error));
  if (response.length) {
    const random = Math.floor(Math.random() * response.length)
    return { birdName: response[random].comName, isReal: true, url }
  }
  return nameGenerator()
}

router.get('/', async (req, res) => {
  const birdData = await birdCall(`https://api.ebird.org/v2/data/obs/${selectLocation()}/recent`, options)
  res.send(birdData)
})

module.exports = router
