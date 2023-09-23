import React from 'react'
import styled from 'styled-components'
import ResetScore from './ResetScore'
import OptionsAndBadges from './OptionsAndBadges'
import media from '../constants/media'

const FooterContainer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  text-align: center;
  color: white;
  align-items: start;
  z-index: 0;
  font-size: 0.875rem;

  a {
    color: white;
    margin: 0 0.5rem;
  }

  p {
    margin: 1rem 0.5rem 0.5rem 0.5rem;
  }

  @media (min-width: ${media.tabletPlus}) {
    display: flex;
    justify-content: center;
  }
`

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
`

const FooterDetails = styled.div`
  background-color: rgb(0,0,0,.35);
  width: 100%;
  padding-bottom: 1rem;
`

const Footer = () => {
  return (
    <FooterContainer>
      <ButtonContainer>
        <ResetScore />
        <OptionsAndBadges />
      </ButtonContainer>
      <FooterDetails>
        <p>Developed by Ryan R. Campbell</p> 🦆 <a href='https://github.com/rrcampbell-exe/real-fake-birds' rel='noopener noreferrer' target='_blank '>GitHub</a> 🦜 <a href='https://www.linkedin.com/in/ryan-campbell-aa33169/' rel='noopener noreferrer' target='_blank '>LinkedIn</a> 🦢 <a href='mailto: campbell.ryan.r@gmail.com'>Contact</a> 🦤
      </FooterDetails>
    </FooterContainer>
  )
}

export default Footer
