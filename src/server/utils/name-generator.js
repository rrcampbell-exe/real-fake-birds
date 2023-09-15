const locations = require('../constants/locations')
const bodyParts = require('../constants/body-parts')
const birdTypes = require ('../constants/bird-types')

const colorSelect = require('../utils/color-select')
const generalAdjectiveSelect = require('./general-adjective-select')
const surnameSelect = require('../utils/surname-select')
const percentAssignment = require('../utils/percent-of-time')


const nameGenerator = async () => {
  const includesSurname = percentAssignment(10)
  const includesAdjective = percentAssignment(40)
  const includesLocation = percentAssignment(35)
  const includesColor = percentAssignment(80)
  const includesBodyPart = percentAssignment(50)

  const surname = includesSurname ? await surnameSelect() : ''
  const adjective = includesAdjective ? await generalAdjectiveSelect() : ''
  const locationVal = (Math.floor(Math.random() * locations.length))
  const location = includesLocation ? locations[locationVal] : ''
  const color = includesColor ? await colorSelect() : ''
  const bodyPartVal = Math.floor(Math.random() * bodyParts.length)
  const bodyPart = (includesColor && includesBodyPart) ? bodyParts[bodyPartVal] : ''
  const birdTypeVal = Math.floor(Math.random() * birdTypes.length)

  // ensures bird values like "Robin" never display on their own as false negatives
  if (!includesSurname && !includesAdjective && !includesLocation && !includesColor) {
    const color = await colorSelect()
    return { birdName: `${color} ${ birdTypes[birdTypeVal]}`, isReal: false }
  }

  return { birdName: `${includesSurname ? surname + "'s " : ''}${includesAdjective ? adjective + ' ' : ''}${includesLocation ? location + ' ' : ''} ${includesColor ? color : ''}${includesBodyPart ? bodyPart : ''} ${ birdTypes[birdTypeVal]}`, isReal: false }
}

module.exports = nameGenerator
