import React from 'react'
import styled from 'styled-components'
import ResetScore from './ResetScore'

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

  a {
    color: white;
    margin: 0 0.5rem;
  }
  p {
    margin: 1rem 0.5rem;
  }

  @media (min-width: 600px) {
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
  return (
    <FooterContainer>
      <ResetScore />
      <FooterDetails>
        <p>Developed by Ryan R. Campbell</p> 🦆 <a href='https://github.com/rrcampbell-exe/real-fake-birds' rel='noopener noreferrer' target='_blank '>GitHub</a> 🦜 <a href='https://www.linkedin.com/in/ryan-campbell-aa33169/' rel='noopener noreferrer' target='_blank '>LinkedIn</a> 🦢 <a href='mailto: campbell.ryan.r@gmail.com'>Contact</a> 🦤
      </FooterDetails>
    </FooterContainer>
  )
}

export default Footer
