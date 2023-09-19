import React from 'react'
import styled from 'styled-components'

const ScoreboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin: 0 0 0 1rem;
  color: white;
  font-size: 0.75rem;
  background-color: rgba(0,0,0,.35);
  width: fit-content;
  padding: 0.5rem;
  border: solid white 1px;
  border-radius: 4px;
  h4 {
    margin-top: 0rem;
    margin-bottom: 0rem;
  }
  a {
    margin-top: 0.25rem;
    color: white;
    font-weight: 500;
  }
  a:hover {
    cursor: pointer;
  }

  @media (min-width: 600px) {
    position: fixed;
    top: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    align-items: end;
    margin: 1rem 1rem 0 0;
    padding: 0;
    border: none;
    background-color: rgba(0,0,0,0);
    h4:first-child {
      margin-top: 1rem;
      margin-bottom: 0rem;
    }
    h4 {
      margin-top: 0.5rem;
      margin-bottom: 0rem;
    }
  }
`

const ResetButton = styled.button`
  background-color: transparent;
  padding: 0;
  margin: 12px 0 0 0;
  width: fit-content;
  font-size: 0.75rem;
  :hover {
    cursor: button;
  }
`

const Scoreboard = () => {
  const birdScore = JSON.parse(localStorage.getItem('birdScore'))
  const { birdsSeen, birdsIdentified, currentStreak } = birdScore
  return (
    <ScoreboardContainer>
      <h4>Correct Answers: {birdsIdentified}/{birdsSeen} ({ Math.floor((birdsIdentified/birdsSeen) * 100)}%)</h4>
      <h4>Current Streak: {currentStreak}</h4>
      <ResetButton onClick={() => { localStorage.clear(); window.location.reload() }}>Reset Score</ResetButton>
    </ScoreboardContainer>
  )
}

export default Scoreboard
