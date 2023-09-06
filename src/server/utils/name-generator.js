const locations = require('../constants/locations')
const bodyParts = require('../constants/body-parts')
const birdTypes = require ('../constants/bird-types')

const colorSelect = require('../utils/color-select')
const generalAdjectiveSelect = require('./general-adjective-select')
const surnameSelect = require('../utils/surname-select')
const percentOfTime = require('../utils/percent-of-time')


const nameGenerator = async () => {
  const includesSurname = percentAssignment(2)

  if (includesSurname) {
    const surname = await surnameSelect() 
    const birdTypeVal = Math.floor(Math.random() * birdTypes.length)

    const getsDescription = percentAssignment(33)

    if (getsDescription) {
      const color = await colorSelect() // TODO: set this to only display some percentage of the time
      const bodyPartVal = Math.floor(Math.random() * bodyParts.length) // TODO: set this to display only if color is being displayed, and sometimes, not display even then
      return { birdName: `${surname}'s ${color}${bodyParts[bodyPartVal]} ${birdTypes[birdTypeVal]}`, isReal: false }
    }

    return { birdName: `${surname}'s ${birdTypes[birdTypeVal]}`, isReal: false }
  }


  const surname = await surnameSelect()
  const adjective = await generalAdjectiveSelect() // TODO: set this to only display some percentage of the time
  const locationVal = (Math.floor(Math.random() * locations.length)) // TODO: set this to only display some percentage of the time
  const color = await colorSelect() // TODO: set this to only display some percentage of the time
  const bodyPartVal = Math.floor(Math.random() * bodyParts.length) // TODO: set this to display only if color is being displayed, and sometimes, not display even then
  const birdTypeVal = Math.floor(Math.random() * birdTypes.length)

  return { birdName: `${surname}'s ${adjective} ${locations[locationVal]} ${color}${bodyParts[bodyPartVal]} ${birdTypes[birdTypeVal]}`, isReal: false }
}

module.exports = nameGenerator
