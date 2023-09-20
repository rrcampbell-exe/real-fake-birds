import React from 'react'
import styled from 'styled-components'

const ConfettiCanvas = styled.canvas`
  z-index: -10;
  position: fixed;
  top: 0;
  left: 0;
`

const Confetti = () => <ConfettiCanvas id='confetti-canvas' />

export default Confetti
