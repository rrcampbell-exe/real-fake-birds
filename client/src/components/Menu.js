import React from 'react'
import styled from 'styled-components'
import BirdSvg from './BirdSvg'
import { getTheme, setTheme } from '../utils/theme-handler'
import { themes } from '../constants/theme'

const MenuWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 100vw;
  background-color: ${({ theme }) => theme.tertiary};
  display: ${props => props.isMenuOpen ? 'flex' : 'none'};
  flex-direction: column;
  overflow: auto;

  button {
    background-color: transparent;
    border: 1px solid ${({ theme }) => theme.menuButtonColor};
    color: ${({ theme }) => theme.menuButtonColor};
  }

  #back-button {
    background-color: ${({ theme }) => theme.secondary};
    border: none;
    color: ${({ theme }) => theme.textColor};
  }
`

const MenuHeader = styled.h1`
  color: ${({ theme }) => theme.menuButtonColor};
`

const ThemeInfoContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  padding: 0 6rem;
`

const BackButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  position: fixed;
  bottom: 0;
  width: 100%;
`

const BackButton = styled.button`
  margin-bottom: 2rem;
`

const ThemeButton = styled.button`
  display: flex;
  justify-content: space-around;
  min-width: 10rem;
`

const Menu = ({ isMenuOpen, setIsMenuOpen }) => {
  return (
    <MenuWrapper isMenuOpen={isMenuOpen}>
      <MenuHeader>Choose a Theme</MenuHeader>
      <ThemeInfoContainer>
        {themes.map((theme) => (
          <ThemeButton onClick={() => { setTheme(JSON.stringify(theme)); window.location.reload(true) }}>
            <BirdSvg color={getTheme().menuButtonColor} size='16px' theme={theme.name} />
            {theme.name}
          </ThemeButton>
        ))}
      </ThemeInfoContainer>
      <BackButtonContainer>
        <BackButton id='back-button' onClick={() => setIsMenuOpen(false)}>Return to Game</BackButton>
      </BackButtonContainer>
    </MenuWrapper>
  )
}

export default Menu
