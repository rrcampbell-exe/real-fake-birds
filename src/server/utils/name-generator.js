const locations = require('../constants/locations')
const colors = require('../constants/colors')
const bodyParts = require('../constants/body-parts')
const birdTypes = require ('../constants/bird-types')

// TODO: introduce adjectives to flow
const generalAdjectives = require('../constants/general-adjectives')
const bodyPartAdjectives = require('../constants/body-part-adjectives')

const nameGenerator = () => {
  const locationVal = (Math.floor(Math.random() * locations.length)) // TODO: set this to only display some percentage of the time
  const colorVal = Math.floor(Math.random() * colors.length) // TODO: set this to only display a percentage of the time
  const bodyPartVal = Math.floor(Math.random() * bodyParts.length) // TODO: set this to display only if color is being displayed, and sometimes, not display even then
  const birdTypeVal = Math.floor(Math.random() * birdTypes.length)

  return `${locations[locationVal]} ${colors[colorVal]}${bodyParts[bodyPartVal]} ${birdTypes[birdTypeVal]}`
}

module.exports = nameGenerator
