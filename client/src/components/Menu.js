import React from 'react'
import styled from 'styled-components'
import BirdSvg from './BirdSvg'
import { getTheme, setTheme } from '../utils/theme-handler'
import { themes } from '../constants/theme'
import media from '../constants/media'

const ModalContent = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 100vw;
  background-color: ${({ theme }) => theme.primary};
  display: ${props => props.isMenuOpen ? 'flex' : 'none'};
  flex-direction: column;
  overflow: auto;
  justify-content: space-around;

  button {
    background-color: transparent;
    border: 1px solid ${({ theme }) => theme.textColor};
    color: ${({ theme }) => theme.textColor};
  }

  #back-button {
    background-color: ${({ theme }) => theme.secondary};
    border: none;
    color: ${({ theme }) => theme.textColor};
  }

  @media (min-width: ${media.tabletPlus}) {
    max-height: 75vh;
    max-width: 60vw;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 0.5rem;
    border: 2px solid ${({ theme }) => theme.secondary};
  }
`

const ModalBackdrop = styled.div`
  display: none;
  @media (min-width: ${media.tabletPlus}) {
    display: ${props => props.isMenuOpen ? 'block' : 'none'};
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 100vw;
    background-color: rgb(0,0,0,.35);
  }
`

const ModalHeader = styled.h1`
  margin-top: 2rem;
  color: ${({ theme }) => theme.textColor};
`

const ModalBody = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  padding: 0 6rem;
`

const ModalFooter = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
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
    <>
      <ModalBackdrop isMenuOpen={isMenuOpen} onClick={() => setIsMenuOpen(false)} />
      <ModalContent isMenuOpen={isMenuOpen}>
        <ModalHeader>Choose a Theme</ModalHeader>
        <ModalBody>
          {themes.map((theme) => (
            <ThemeButton onClick={() => { setTheme(JSON.stringify(theme)); window.location.reload(true) }} key={theme.name}>
              <BirdSvg color={getTheme().textColor} size='16px' theme={theme.name} />
              {theme.name}
            </ThemeButton>
          ))}
        </ModalBody>
        <ModalFooter>
          <BackButton id='back-button' onClick={() => setIsMenuOpen(false)}>Return to Game</BackButton>
        </ModalFooter>
      </ModalContent>
    </>
  )
}

export default Menu
