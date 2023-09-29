import styled from 'styled-components'
import { Link } from 'react-router-dom'

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

export const MenuHeader = styled.h3`
  display: flex;
  justify-content: center;
  color: ${({ theme }) => theme.textColor};
`

export const MenuBody = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  padding: 0 3rem;
  text-align: center;
`

export const ThemeButtonContainer = styled.div``

export const BadgesContainer = styled.div``

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