import React from 'react'
import styled from 'styled-components'
import ProgressBar from './ProgressBar'
import streakValues from '../constants/streak-values'
import milestoneValues from '../constants/milestone-values'
import { isNextStreakEval, isNextMilestoneEval, currentStreakGoalEval, currentMilestoneGoalEval } from '../utils/goals-evaluation'
import media from '../constants/media'

const ScoreboardContainer = styled.div`
  display: flex;
  flex-direction: row;
  margin: 0 1rem 0 1rem;
  font-size: 0.75rem;
  background-color: rgba(0,0,0,.35);
  padding: 0.5rem;
  border: solid ${({ theme }) => theme.textColor} 1px;
  border-radius: 4px;
  h4 {
    margin-top: 0.25rem;
    margin-bottom: 0.5rem;
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
    #streak-progress-container {
      width: 100%;
    }
  }
`

const MobileFlexContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 50%;
  text-align: center;
  align-items: center;
  h4 {
    display: flex;
    flex-direction: column;
    justify-content: space-around;
  }
  @media (min-width: ${media.tabletPlus}) {
    display: block;
    width: fit-content;
    text-align: right;
    h4 {
      flex-direction: row;
    }
  }
`

const Punctuation = styled.span`
  display: none;
  @media (min-width: ${media.tabletPlus}) {
    display: block;
  }
`

const Scoreboard = () => {
  const birdScore = JSON.parse(localStorage.getItem('birdScore'))
  const { birdsSeen, birdsIdentified, currentStreak, bestStreak } = birdScore

  const isNextStreak = isNextStreakEval(streakValues, currentStreak)
  const isCurrentStreakGoal = currentStreakGoalEval(streakValues, currentStreak)

  const isNextMilestone = isNextMilestoneEval(milestoneValues, birdsIdentified)
  const isCurrentMilestoneGoal = currentMilestoneGoalEval(milestoneValues, birdsIdentified)
  
  const justAchievedStreak = JSON.parse(localStorage.getItem('birdStreakAchieved'))
  const justAchievedMilestone = JSON.parse(localStorage.getItem('birdMilestoneAchieved'))

  const maxValue = (currentValue, isNextGoal, isCurrentGoal, justAchievedGoal) => {
    if ((currentValue === isCurrentGoal) && justAchievedGoal) {
      return isCurrentGoal
    }
    return isNextGoal
  }

  return (
    <ScoreboardContainer>
      <MobileFlexContainer>
        <ProgressBar isMilestoneBar currentValue={birdsIdentified} maxValue={maxValue(birdsIdentified, isNextMilestone, isCurrentMilestoneGoal, justAchievedMilestone)}/>
        <h4>
          Correct Answers
          <Punctuation>:</Punctuation>
          <span>
            {birdsIdentified}/{birdsSeen} ({ Math.floor((birdsIdentified/birdsSeen) * 100)}%)
          </span>
        </h4>
      </MobileFlexContainer>
      <MobileFlexContainer id='streak-progress-container'>
        <ProgressBar currentValue={currentStreak} maxValue={maxValue(currentStreak, isNextStreak, isCurrentStreakGoal, justAchievedStreak)}/>
        <h4>
          Current Streak: {currentStreak}
          <Punctuation> |</Punctuation>
          <span>
            Best: {bestStreak}
          </span>
        </h4>
      </MobileFlexContainer>
    </ScoreboardContainer>
  )
}

export default Scoreboard
