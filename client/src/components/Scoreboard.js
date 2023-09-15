import React from 'react'

// TODO: style scoreboard, consider move to upper-left of page

const Scoreboard = () => {
  const birdScore = JSON.parse(localStorage.getItem('birdScore'))
  const { birdsSeen, birdsIdentified } = birdScore
  return (
    <>
      <p>Correct Answers: {birdsIdentified}/{birdsSeen} ({ Math.floor((birdsIdentified/birdsSeen) * 100)}%)</p>
      <button onClick={() => { localStorage.clear(); window.location.reload() }}>Reset Score</button>
    </>
  )
}

export default Scoreboard
