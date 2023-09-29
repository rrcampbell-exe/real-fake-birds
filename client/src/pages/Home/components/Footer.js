import React from 'react'
import styled from 'styled-components'
import OptionsAndBadges from '../../Menu/components/OptionsAndBadges'
import media from '../../../constants/media'
import { Robin, Flamingo, Swan, Gull } from '../../../constants/bird-svg'
import { getTheme } from '../../../utils/theme-handler'

const FooterContainer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  text-align: center;
  align-items: end;
  z-index: 0;
  font-size: 0.875rem;
  width: 100%;

  a {
    color: ${({ theme }) => theme.textColor};
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

const FooterDetails = styled.div`
  background-color: rgb(0,0,0,.35);
  width: 100%;
  padding-bottom: 1rem;
`

const Footer = () => {
  const { textColor } = getTheme()
  return (
    <FooterContainer>
      <OptionsAndBadges />
      <FooterDetails>
        <p>Developed by Ryan R. Campbell</p> 
        <Robin color={textColor} size='12px' /> 
        <a href='https://github.com/rrcampbell-exe/real-fake-birds' rel='noopener noreferrer' target='_blank '>GitHub</a> 
        <Swan color={textColor} size='12px' /> 
        <a href='https://www.linkedin.com/in/ryan-campbell-aa33169/' rel='noopener noreferrer' target='_blank '>LinkedIn</a> 
        <Flamingo color={textColor} size='12px' /> 
        <a href='mailto: campbell.ryan.r@gmail.com'>Contact</a> 
        <Gull color={textColor} size='12px' />
      </FooterDetails>
    </FooterContainer>
  )
}

export default Footer
