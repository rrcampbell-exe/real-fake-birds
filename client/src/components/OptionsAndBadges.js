import React, { useState } from 'react'
import styled from 'styled-components'
import BirdSvg from './BirdSvg'
import Menu from './Menu'
import { getTheme } from '../utils/theme-handler'

const OptionsButton = styled.button`
  border-radius: 50%;
  background-color: transparent;
  border: 1px solid ${({ theme }) => theme.textColor};
  padding: 0.7rem 0.65rem 0.5rem 0.5rem;
  margin: 1rem;
  height: 2.5rem;
  width: 2.5rem;
  box-shadow: 1px 1px;
`

const OptionsAndBadges = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { textColor, name } = getTheme()

  return (
    <>
      <Menu isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
      <OptionsButton onClick={() => setIsMenuOpen(true)} >
        <BirdSvg color={textColor} size='16px' theme={name} />
      </OptionsButton>
    </>
  )
}

export default OptionsAndBadges
