import React from 'react'
import styled from 'styled-components'

const TitleContainer = styled.div`
  text-align: center;
  color: white;
  margin: 8rem -50% 0 0;
  position: fixed;
  left: 50%;
  bottom: auto;
  right: auto;
  transform: translate(-50%, -50%);
`

const PageTitle = () => {
  return (
    <TitleContainer>
      <h1>Real Fake Birds</h1>
      <h4>Some are real. Some are fake. Guess which are which.</h4>
    </TitleContainer>
  )
}

export default PageTitle
