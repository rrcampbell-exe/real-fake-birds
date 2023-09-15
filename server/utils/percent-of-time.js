const percentOfTime = (percent) => {
  return (Math.floor(Math.random() * 100)) <= (percent - 1)
}

module.exports = percentOfTime