const bodyParts = require('../constants/body-parts')
const birdTypes = require ('../constants/bird-types')
const locations = require('../constants/locations')

const colorSelect = require('../utils/color-select')
const generalAdjectiveSelect = require('./general-adjective-select')
const surnameSelect = require('../utils/surname-select')
const percentAssignment = require('../utils/percent-of-time')


const nameGenerator = async () => {
  const includesSurname = percentAssignment(5)
  const includesAdjective = percentAssignment(20)
  const includesLocation = percentAssignment(35)
  const includesColor = percentAssignment(80)
  const includesBodyPart = percentAssignment(30)

  const surname = includesSurname ? await surnameSelect() : ''

  const adjective = includesAdjective ? await generalAdjectiveSelect() : ''

  const locationVal = (Math.floor(Math.random() * locations.length))
  const { demonym, name, subregion } = locations[locationVal]
  const locationsArr = [demonym, name, subregion]
  const locationArrVal = (Math.floor(Math.random() * locationsArr.length))
  const location = includesLocation ? locationsArr[locationArrVal] : ''

  const color = includesColor ? await colorSelect() : ''
  
  const bodyPartVal = Math.floor(Math.random() * bodyParts.length)
  const bodyPart = (includesColor && includesBodyPart) ? bodyParts[bodyPartVal] : ''
  const birdTypeVal = Math.floor(Math.random() * birdTypes.length)

  // // ensures bird values like "Robin" never display on their own as false negatives
  if (!includesSurname && !includesAdjective && !includesLocation && !includesColor) {
    const color = await colorSelect()
    return { birdName: `${color} ${ birdTypes[birdTypeVal]}`, isReal: false }
  }

  return { birdName: `${includesSurname ? surname + "'s " : ''}${includesAdjective ? adjective + ' ' : ''}${includesLocation ? location + ' ' : ''}${includesColor ? color : ''}${includesBodyPart ? bodyPart : ''} ${ birdTypes[birdTypeVal]}`, isReal: false }  
}

module.exports = nameGenerator
