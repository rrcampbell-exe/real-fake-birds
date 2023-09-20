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
  // force a fakeBird 47% of the time
  // this number is 47%, as ~3% of the time, response.length (below) will be false
  const fakeBird = percentOfTime(47)

  // instantiate timeout for failures of or delays caused by ebirds api
  const { timeout = 8000 } = options
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  if (fakeBird) {
    return nameGenerator()
  }

  const response = await fetch(url, { ...options, signal: controller.signal })
    .then(response => {
      clearTimeout(id) // if it takes more than timeout milliseconds to receive a response, abort call
      return response.json()
    })
    .catch(error => console.log('error', error));

  // send error to client if timeout occurs
  if (!response) {
    return { error: 'birdCall timed out' }
  }

  // if a response is received and that response has bird data, assign real bird name
  if (response && response.length) {
    const random = Math.floor(Math.random() * response.length)
    return { birdName: response[random].comName, isReal: true, url }
  }

  return nameGenerator()
}

router.get('/', async (req, res) => {
  const birdData = await birdCall(`https://api.ebird.org/v2/data/obs/${selectLocation()}/recent?back=30`, options)
  res.send(birdData)
})

module.exports = router
