import React from 'react'
import styled from 'styled-components'

const FooterContainer = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background-color: rgb(0,0,0,.35);
  padding: 1.5rem 0;
  text-align: center;
  color: white;

  a {
    color: white;
    margin: 0 0.5rem;
  }
  p {
    margin: 0 0.5rem 0.5rem 0;
  }
  span {
    visibility: visible;
  }

  @media (min-width: 600px) {
    display: flex;
    align-items: center;
    justify-content: center;
    p {
      margin: 1rem 0.5rem;
    }
    span {
      visibility: hidden;
    }
  }
`

const Footer = () => {
  return (
    <FooterContainer>
      <p>Developed by Ryan R. Campbell</p> 🦆 <a href='https://github.com/rrcampbell-exe/real-fake-birds' rel='noopener noreferrer' target='_blank '>GitHub</a> 🦜 <a href='https://www.linkedin.com/in/ryan-campbell-aa33169/' rel='noopener noreferrer' target='_blank '>LinkedIn</a> 🦢 <a href='mailto: campbell.ryan.r@gmail.com'>Contact</a> <span>🦤</span>
    </FooterContainer>
  )
}

export default Footer
