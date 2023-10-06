import React from 'react'
import styled, { keyframes, css } from 'styled-components'
import BirdSvg from '../../Home/components/BirdSvg'
import { getTheme } from '../../../utils/theme-handler'
import { Link } from 'react-router-dom'

const pulse = (initialBoxShadow, finalBoxShadow) => keyframes`
  0% {
    box-shadow: ${initialBoxShadow};
  }
  100% {
    box-shadow: ${finalBoxShadow};
  }
`

const OptionsButton = styled.button`
  border-radius: 50%;
  background-color: transparent;
  border: 1px solid ${({ theme }) => theme.textColor};
  padding: 0.7rem 0.65rem 0.5rem 0.5rem;
  margin: 1rem;
  height: 3rem;
  width: 3rem;
  ${props => props.hasUnseenBadges && css`
    animation: ${pulse(`0 0 0 0px`, `0 0 0 16px rgba(0, 0, 0, 0)`)} ease 1.2s infinite;
  `}
`

const OptionsAndBadges = () => {
  const { textColor, name } = getTheme()

  const hasUnseenBadges = JSON.parse(localStorage.getItem('hasUnseenBadges'))

  return (
    <Link to='/menu'>
      <OptionsButton hasUnseenBadges={hasUnseenBadges} onClick={() => localStorage.setItem('hasUnseenBadges', false)} >
        <BirdSvg color={textColor} size='1.2rem' theme={name} />
      </OptionsButton>
    </Link>
  )
}

export default OptionsAndBadges
