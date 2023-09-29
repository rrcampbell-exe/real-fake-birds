const error = (response) => response.hasOwnProperty('error')

const errorEval = (response) => response.some(error)

module.exports = errorEval

