import React from 'react'
import styled from 'styled-components'
import ProgressBar from './ProgressBar'
import streakValues from '../constants/streak-values'
import milestoneValues from '../constants/milestone-values'

const ScoreboardContainer = styled.div`
  position: fixed;
  top: 75%;
  display: flex;
  flex-direction: column;
  color: white;
  font-size: 0.75rem;
  width: 33%;
  padding: 0.5rem;
  h4 {
    margin-top: 0rem;
    margin-bottom: 0rem;
  }
  h4:first-child {
      margin-top: 1rem;
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
    top: 80%;
    flex-direction: row;
    padding: 0;
    border: none;
    width: 100%;
    background-color: rgba(0,0,0,0);
    h4:first-child {
      margin-top: 0;
    }
    #answers-container {
      align-items: flex-end;
    }
  }
`

const StreakContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: start;
  padding: 0 1rem;
  h2 {
      margin: 0.5rem 0 0.2rem 0;
    }
  #answers-label {
      margin-bottom: 0.65rem;
    }

  @media (min-width: 600px) {
    width: 33%;
    align-items: center;
    justify-content: center;
  }
`

const ResetButton = styled.button`
  background-color: transparent;
  padding: 0;
  margin: 0;
  width: fit-content;
  font-size: 0.75rem;
  :hover {
    cursor: button;
  }
`

// TODO: figure out where to put correct answers info
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
      <StreakContainer>
        <ProgressBar currentValue={currentStreak} maxValue={maxValue(currentStreak, isNextStreak, isCurrentStreakGoal, justAchievedStreak)}/>
        <h4>Current Streak: {currentStreak}</h4>
        {/* <ResetButton onClick={() => { localStorage.clear(); window.location.reload() }}>Reset Score</ResetButton> */}
      </StreakContainer>
      <StreakContainer>
        <ProgressBar isMilestoneBar currentValue={birdsIdentified} maxValue={maxValue(birdsIdentified, isNextMilestone, isCurrentMilestoneGoal, justAchievedMilestone)}/>
        <h4>Milestone Tracker</h4>
      </StreakContainer>
      <StreakContainer id='answers-container'>
        <h2>{birdsIdentified}/{birdsSeen} ({ Math.floor((birdsIdentified/birdsSeen) * 100)}%)</h2>
        <h4 id='answers-label'>Correct Answers</h4>
      </StreakContainer>
    </ScoreboardContainer>
  )
}

export default Scoreboard
