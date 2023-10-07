import React from 'react'
import styled from 'styled-components'
import media from '../../../constants/media'
import { getTheme } from '../../../utils/theme-handler'

const LoadingWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
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
      <LoadingGif src={getTheme().gifLink} alt={getTheme().gifAlt} />
      <p>bird watching. . .</p>
    </LoadingWrapper>
  )
}

export default LoadingState
