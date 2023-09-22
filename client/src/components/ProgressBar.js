import React from 'react'
import styled from 'styled-components'
import media from '../constants/media'
import themes from '../constants/themes'

const ProgressBarWrapper = styled.div`
  background-color: #f1f1f1;
  border-radius: 1rem;
  width: 90%;
  height: 0.5rem;
  margin: 0.5rem 0 0.25rem 0;
  overflow: hidden;
  @media (min-width: ${media.tabletPlus}) {
    width: 100%;
  }
`

const Bar = styled.div`
  color: #fff;
  background-color: ${props => props.isMilestoneBar ? themes.default.tertiary : themes.default.secondary};
  border-radius: 1rem;
  height: 0.5rem;
  width: ${props => props.percent};
  transition: width 0.5s ease-in-out;
`

const ProgressBar = ({ currentValue, maxValue, isMilestoneBar }) => {
  const widthVal = (currentValue, maxValue) => ((currentValue / maxValue) * 100)
  return (
    <ProgressBarWrapper>
      <Bar isMilestoneBar={isMilestoneBar} percent={widthVal(currentValue, maxValue) + '%'} />
    </ProgressBarWrapper>
  )
}

export default ProgressBar
