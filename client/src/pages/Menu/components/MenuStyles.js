import styled from 'styled-components'
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
  justify-content: start;
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