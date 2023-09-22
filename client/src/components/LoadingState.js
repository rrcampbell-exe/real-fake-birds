import React from 'react'
import styled from 'styled-components'
import media from '../constants/media'

const LoadingWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  color: white;
`

const LoadingGif = styled.img`
  height: 150px;
  width: 150px;
  border-radius: 50%;
  @media (min-width: ${media.tabletPlus}) {
    height: 200px;
    width: 200px;
  }
`

const LoadingState = () => {
  return (
    <LoadingWrapper>
      <LoadingGif src="https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExOTFpeTdzaDg3NTNpaHZsOW50MGczd29wZTR1a24xMDZ4ZGtjb3UzbiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/JIJP1LCAtxzuCvmvIa/giphy.gif" alt="Little Bird Illustration GIF by Unpopular Cartoonist" />
      <p>bird watching. . .</p>
    </LoadingWrapper>
  )
}

export default LoadingState
