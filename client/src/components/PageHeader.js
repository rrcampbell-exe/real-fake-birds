import React from 'react'
import styled from 'styled-components'

const TitleContainer = styled.div`
  text-align: left;
  font-size: 1rem;
  color: white;
  margin: 0.5rem 0 0 1rem;
  display: flex;
  flex-direction: column;
  h1 {
    margin-bottom: 0;
    font-size: 1.75rem;
  }
  h4 {
    margin-top: 0.25rem;
    font-size: 0.85rem;
  }

  @media (min-width: 600px) {
    h1 {
      font-size: 2rem;
    }
    h4 {
      margin-top: 0.5rem;
      font-size: 1rem;
    }
  }
`

const HeaderContainer = styled.div`
  @media (min-width: 600px) {
    position: fixed;
    display: flex;
    justify-content: space-between;
  }
`

const PageTitle = () => {
  return (
    <HeaderContainer>
      <TitleContainer>
        <h1>Real Fake Birds 🦉</h1>
        <h4>Some are real. Some are fake. Tell them apart.</h4>
      </TitleContainer>
    </HeaderContainer>
  )
}

export default PageTitle
