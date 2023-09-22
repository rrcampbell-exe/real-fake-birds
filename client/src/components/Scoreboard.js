import React from 'react'
import styled from 'styled-components'
import ProgressBar from './ProgressBar'
import streakValues from '../constants/streak-values'
import milestoneValues from '../constants/milestone-values'

const ScoreboardContainer = styled.div`
  display: flex;
  flex-direction: row;
  margin: 0 1rem 0 1rem;
  color: white;
  font-size: 0.75rem;
  background-color: rgba(0,0,0,.35);
  padding: 0.5rem;
  border: solid white 1px;
  border-radius: 4px;
  h4 {
    margin-top: 0.25rem;
    margin-bottom: 0.5rem;
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
  @media (min-width: 600px) {
    display: block;
    width: fit-content;
    text-align: right;
  }
`

// TODO: refactor streaks/milestones functionality to minimize duplicate code where possible
// TODO: make reset button available only during development (or hide it in options menu, eventually)

const Scoreboard = () => {
  const birdScore = JSON.parse(localStorage.getItem('birdScore'))
  const { birdsSeen, birdsIdentified, currentStreak } = birdScore

  const areAvailableStreaks = (streakValues) => streakValues > currentStreak
  const isNextStreak = streakValues.filter(areAvailableStreaks)[0]

  const areAvailableMilestones = (milestoneValues) => milestoneValues > birdsIdentified
  const isNextMilestone = milestoneValues.filter(areAvailableMilestones)[0]

  const currentStreakGoalEval = (streakValues) => streakValues === currentStreak
  const isCurrentStreakGoal = streakValues.filter(currentStreakGoalEval)[0]

  const currentMilestoneGoalEval = (milestoneValues) => milestoneValues === birdsIdentified
  const isCurrentMilestoneGoal = milestoneValues.filter(currentMilestoneGoalEval)[0]
      
  const justAchievedStreak = localStorage.getItem('birdStreakAchieved') === 'true' ? true : false
  const justAchievedMilestone = localStorage.getItem('birdMilestoneAchieved') === 'true' ? true : false

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
        <h4 id='answers-label'>Correct Answers: {birdsIdentified}/{birdsSeen} ({ Math.floor((birdsIdentified/birdsSeen) * 100)}%)</h4>
      </MobileFlexContainer>
      <MobileFlexContainer id='streak-progress-container'>
        <ProgressBar currentValue={currentStreak} maxValue={maxValue(currentStreak, isNextStreak, isCurrentStreakGoal, justAchievedStreak)}/>
        <h4>Current Streak: {currentStreak}</h4>
      </MobileFlexContainer>
    </ScoreboardContainer>
  )
}

export default Scoreboard
