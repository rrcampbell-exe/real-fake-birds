import React from 'react'
import styled from 'styled-components'
import ProgressBar from './ProgressBar'
import streakValues from '../constants/streak-values'
import { isNextStreakEval, currentStreakGoalEval } from '../utils/goals-evaluation'
import media from '../constants/media'

const ScoreboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin: 0 1rem 0 1rem;
  font-size: 0.75rem;
  background-color: rgba(0,0,0,.35);
  padding: 0.5rem;
  border: solid ${({ theme }) => theme.textColor} 1px;
  border-radius: 4px;
  width: fit-content;
  h4 {
    margin-top: 0.5rem;
    margin-bottom: 0rem;
  }
  a {
    margin-top: 0.25rem;
    font-weight: 500;
  }
  a:hover {
    cursor: pointer;
  }

  @media (min-width: ${media.tabletPlus}) {
    position: fixed;
    top: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    align-items: end;
    margin: 1.5rem 1rem 0 0;
    padding: 0;
    border: none;
    background-color: rgba(0,0,0,0);
    width: fit-content;
  }
`

const Scoreboard = () => {
  const birdScore = JSON.parse(localStorage.getItem('birdScore'))
  const { birdsSeen, birdsIdentified, currentStreak, bestStreak } = birdScore

  const isNextStreak = isNextStreakEval(streakValues, currentStreak)
  const isCurrentStreakGoal = currentStreakGoalEval(streakValues, currentStreak)
  
  const justAchievedStreak = JSON.parse(localStorage.getItem('birdStreakAchieved'))

  const maxValue = (currentValue, isNextGoal, isCurrentGoal, justAchievedGoal) => {
    if ((currentValue === isCurrentGoal) && justAchievedGoal) {
      return isCurrentGoal
    }
    return isNextGoal
  }

  return (
    <ScoreboardContainer>
      <ProgressBar currentValue={currentStreak} maxValue={maxValue(currentStreak, isNextStreak, isCurrentStreakGoal, justAchievedStreak)}/>
      <h4>Current Streak: {currentStreak} | Best Streak: {bestStreak}</h4>
      <h4>Correct Answers: {birdsIdentified}/{birdsSeen} ({ Math.floor((birdsIdentified/birdsSeen) * 100)}%)</h4>
    </ScoreboardContainer>
  )
}

export default Scoreboard
