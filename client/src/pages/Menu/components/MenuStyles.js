import styled, { keyframes, css } from 'styled-components'
import { Link } from 'react-router-dom'
import media from '../../../constants/media'

export const MenuContent = styled.div`
  button {
    background-color: transparent;
    border: 1px solid ${({ theme }) => theme.textColor};
    color: ${({ theme }) => theme.textColor};
  }

  #back-button {
    background-color: ${({ theme }) => theme.secondary};
    border: none;
    color: ${({ theme }) => theme.textColor};
  }

`

export const MenuBody = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  padding: 0 3rem;
  text-align: center;
`

export const ThemeButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0 1rem;
  @media (min-width: ${media.tabletPlus}) {
    width: 40%;
  }
`

export const BadgesContainer = styled.div`
  margin: 0 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  svg {
    margin: 0.25rem 0.5rem;
  }
  @media (min-width: ${media.tabletPlus}) {
    width: 40%;
  }
`

export const MenuFooter = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`

export const BackButton = styled.button`
  margin-bottom: 2rem;
`

export const ThemeButton = styled.button`
  display: flex;
  justify-content: space-around;
  min-width: 10rem;
`

export const StyledLink = styled(Link)`
  text-decoration: none;
`

export const pulse = (initialBoxShadow, finalBoxShadow) => keyframes`
  0% {
    box-shadow: ${initialBoxShadow};
  }
  100% {
    box-shadow: ${finalBoxShadow};
  }
`

export const OptionsButton = styled.button`
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

export const BadgeCollectionContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 20rem;
`

export const BadgeWrapper = styled.div`
  display: flex;
  flex-direction: column;
`

export const BadgeDescriptionTooltip = styled.div`
  width: fit-content;
  max-width: 170px;
  margin-top: 60px;
  margin-left: -60px;
  background-color: ${({ theme }) => theme.secondary};
  color: ${({ theme }) => theme.textColor};
  text-align: center;
  padding: 5px;
  border: 1px solid ${({ theme }) => theme.textColor};
  border-radius: 4px;
  position: absolute;
  z-index: 1;
`

export const BadgeName = styled.p`
  margin-top: 0;
  margin-bottom: 1rem;
  font-weight: 500;
  font-size: 0.875rem;
`

export const BadgeDescription = styled.p`
  font-size: 0.75rem;
  margin-top: 0.5rem;
`