const router = require('express').Router();
const dotenv = require('dotenv')
const API_KEY = dotenv.config().parsed.REACT_APP_API_KEY
const nameGenerator = require ('../utils/name-generator')

const url = "https://api.ebird.org/v2/data/obs/US/recent"
const options = {
  headers: {
    'X-eBirdApiToken': API_KEY
  },
  method: 'GET',
  redirect: 'follow'
};

const birdCall = async (url, options) => {
  const fakeBird = (Math.floor(Math.random() * 2) === 0)
  if (fakeBird) {
    // TODO: update below with algorithm that generates fake bird names
    console.log('it is a fake name')
    return nameGenerator()
  }
  const response = await fetch(url, options)
    .then(response => {
      return response.json()
    })
    .catch(error => console.log('error', error));
  const random = Math.floor(Math.random() * response.length)
  return response[random].comName
}

router.get('/', async (req, res) => {
  const birdData = await birdCall(url, options)
  res.send(birdData)
})

module.exports = router
