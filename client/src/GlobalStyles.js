import { createGlobalStyle } from 'styled-components'

const GlobalStyle = createGlobalStyle`
  body {
    background-color: ${({ theme }) => theme.primary};
    color: ${({ theme }) => theme.textColor};
  }
  button {
    background-color: ${({ theme }) => theme.secondary};
    border-radius: 30px;
    border: none;
    padding: 0.75rem;
    margin: 0.75rem;
    color: ${({ theme }) => theme.textColor};
  }
`

export default GlobalStyle
