import React from 'react'
import styled from 'styled-components'
import { setTheme } from '../utils/theme-handler'
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
  justify-content: space-between;
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
  flex-direction: column;
`

const BackButton = styled.button`
  margin-bottom: 2rem;
`

const Menu = ({ isMenuOpen, setIsMenuOpen }) => {
  return (
    <MenuWrapper isMenuOpen={isMenuOpen}>
      <ThemeInfoContainer>
        <MenuHeader>Choose a Theme</MenuHeader>
        {themes.map((theme) => (
          <button onClick={() => { setTheme(JSON.stringify(theme)); window.location.reload(true) }}>{theme.name}</button>
        ))}
      </ThemeInfoContainer>
      <BackButton id='back-button' onClick={() => setIsMenuOpen(false)}>Return to Game</BackButton>
    </MenuWrapper>
  )
}

export default Menu
