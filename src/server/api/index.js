const router = require('express').Router();
const dotenv = require('dotenv')
const API_KEY = dotenv.config().parsed.REACT_APP_API_KEY

const url = "https://api.ebird.org/v2/data/obs/US/recent"
const options = {
  headers: {
    'X-eBirdApiToken': API_KEY
  },
  method: 'GET',
  redirect: 'follow'
};

const birdCall = async (url, options) => {
  const response = await fetch(url, options)
    .then(response => {
      return response.json()
    })
    .catch(error => console.log('error', error));

  console.log('this is the response.length', response.length)
  const random = Math.floor(Math.random() * response.length)
  return response[random].comName
}

router.get('/', async (req, res) => {
  const birdData = await birdCall(url, options)
  res.send(birdData)
})

module.exports = router
