const locations = require('../constants/locations')
const bodyParts = require('../constants/body-parts')
const birdTypes = require ('../constants/bird-types')

const colorSelect = require('../utils/color-select')
const generalAdjectiveSelect = require('./general-adjective-select')

// TODO: introduce adjectives to flow
const bodyPartAdjectives = require('../constants/body-part-adjectives')


const nameGenerator = async () => {
  const locationVal = (Math.floor(Math.random() * locations.length)) // TODO: set this to only display some percentage of the time
  const color = await colorSelect() // TODO: set this to only display some percentage of the time
  const adjective = await generalAdjectiveSelect() // TODO: set this to only display some percentage of the time
  const bodyPartVal = Math.floor(Math.random() * bodyParts.length) // TODO: set this to display only if color is being displayed, and sometimes, not display even then
  const birdTypeVal = Math.floor(Math.random() * birdTypes.length)

  return `${adjective} ${locations[locationVal]} ${color}${bodyParts[bodyPartVal]} ${birdTypes[birdTypeVal]}`
}

module.exports = nameGenerator
