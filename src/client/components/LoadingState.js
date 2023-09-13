import React from 'react'
import styled from 'styled-components'

const LoadingWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  color: white;
`

const LoadingGif = styled.iframe`
  width: 480px;
  height: 398px;
  border: 0;
  height: 50%;
  width: 50%;
`

// TODO: simplify loading state

const LoadingState = () => {
  return (
    <LoadingWrapper>
      <LoadingGif src="https://giphy.com/embed/JIJP1LCAtxzuCvmvIa" allowFullScreen />
      <p>bird watching . . .</p>
    </LoadingWrapper>
  )
}

export default LoadingState
