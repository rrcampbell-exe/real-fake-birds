import React, { useState } from 'react'
import styled from 'styled-components'
import BirdSvg from './BirdSvg'
import Menu from './Menu'

const OptionsButton = styled.button`
  border-radius: 50%;
  background-color: transparent;
  border: 1px solid white;
  padding: 0.5rem;
  margin: 1rem;
  height: 2rem;
  width: 2rem;
`

const OptionsAndBadges = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  return (
    <>
      <Menu isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
      <OptionsButton onClick={() => setIsMenuOpen(true)} >
        <BirdSvg/>
      </OptionsButton>
    </>
  )
}

export default OptionsAndBadges
