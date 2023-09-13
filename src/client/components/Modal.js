import React from 'react'
import styled from 'styled-components'

const Modal = styled.div`
  display: ${props => props.isOpen ? 'flex' : 'none'};
  width: 50vw;
  flex-direction: column;
  align-items: center;
  position: fixed;
  top: 50%;
  left: 50%;
  right: auto;
  bottom: auto;
  margin-right: -50%;
  transform: translate(-50%, -50%);
  padding: 10rem;
  border: solid black;
  border-radius: 0.5rem; 
  background-color: #1DA1F2;
  color: white;
`

const AnswerModal = ({ isOpen, birdData, isReal, isCorrect }) => {
  return (
    <Modal
      isOpen={isOpen}
    >
      <h1>{isCorrect ? 'Correct!' : 'Incorrect!'}</h1>
      <p>The {birdData} is a {isReal ? 'real' : 'fake'} bird.</p>
      <button onClick={() => window.location.reload(true)}>Try Again</button>
    </Modal>
  )
}

export default AnswerModal 
