import React from 'react'
import styled from 'styled-components'
import Scoreboard from './Scoreboard'

const TitleContainer = styled.div`
  text-align: center;
  color: white;
  margin-top: 2rem;
`

const PageTitle = () => {
  return (
    <TitleContainer>
      <h1>Real Fake Birds</h1>
      <h4>Some are real. Some are fake. Tell them apart.</h4>
      {localStorage.getItem('birdScore') && <Scoreboard />}
    </TitleContainer>
  )
}

export default PageTitle
