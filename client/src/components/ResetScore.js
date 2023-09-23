import React from 'react'
import styled from 'styled-components'

const ResetButton = styled.button`
  background-color: transparent;
  border: 1px solid ${({ theme }) => theme.textColor};
  padding: 0.5rem;
  font-size: 0.75rem;
  margin: 1rem;
  z-index: 0;

  :hover {
    cursor: button;
  }
`
      
const ResetScore = () => <ResetButton onClick={() => { localStorage.clear(); window.location.reload() }}>Reset Score</ResetButton>

export default ResetScore
