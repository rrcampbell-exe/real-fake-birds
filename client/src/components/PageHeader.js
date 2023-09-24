import React from 'react'
import styled from 'styled-components'
import media from '../constants/media'
import BirdSvg from './BirdSvg'
import { getTheme } from '../utils/theme-handler'

const TitleContainer = styled.div`
  text-align: left;
  font-size: 1rem;
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

  @media (min-width: ${media.tabletPlus}) {
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
  @media (min-width: ${media.tabletPlus}) {
    position: fixed;
    display: flex;
    justify-content: space-between;
  }
`

const PageTitle = () => {
  const { textColor, name } = getTheme()
  return (
    <HeaderContainer>
      <TitleContainer>
        <h1>Real Fake Birds <BirdSvg size={'1.5rem'} color={textColor} /></h1>
        <h4>Some are real. Some are fake. Tell them apart.</h4>
      </TitleContainer>
    </HeaderContainer>
  )
}

export default PageTitle
