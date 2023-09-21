import React from 'react'
import styled from 'styled-components'

const ProgressBarWrapper = styled.div`
  background-color: #f1f1f1;
  border-radius: 1rem;
  width: 100%;
  margin: 0.5rem 0;
  overflow: hidden;
`

const Bar = styled.div`
  color: #fff;
  background-color: #3f1212;
  border-radius: 1rem;
  height: 0.5rem;
  width: ${props => props.percent};
  transition: width 0.5s ease-in-out;
`

const ProgressBar = ({ currentValue, maxValue }) => {
  const widthVal = (currentValue, maxValue) => ((currentValue / maxValue) * 100)
  return (
    <ProgressBarWrapper>
      <Bar percent={widthVal(currentValue, maxValue) + '%'} />
    </ProgressBarWrapper>
  )
}

export default ProgressBar
