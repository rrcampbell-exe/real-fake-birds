import React from 'react'
import styled from 'styled-components'
import { setTheme } from '../utils/theme-handler'
import { themes, defaultTheme, raven } from '../constants/theme'

const MenuWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 100vw;
  background-color: ${({ theme }) => theme.tertiary};
  display: ${props => props.isMenuOpen ? 'flex' : 'none'};
  flex-direction: column;
  button {
    background-color: transparent;
    border: 1px solid white;
  }
  #back-button {
    background-color: ${({ theme }) => theme.secondary};
    border: none;
  }
`

const Menu = ({ isMenuOpen, setIsMenuOpen }) => {
  return (
    <MenuWrapper isMenuOpen={isMenuOpen}>
      <h1>Choose a Theme</h1>
      {themes.map((theme) => (
        <button onClick={() => { setTheme(JSON.stringify(theme)); window.location.reload(true) }}>{theme.name}</button>
      ))}
      <button id='back-button' onClick={() => setIsMenuOpen(false)}>Return to Game</button>
    </MenuWrapper>
  )
}

export default Menu
