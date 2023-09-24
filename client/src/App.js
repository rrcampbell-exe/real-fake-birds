import BirdNameSection from './components/BirdNameSection'
import PageTitle from './components/PageHeader'
import Footer from './components/Footer'
import Confetti from './components/Confetti'
import { createGlobalStyle } from 'styled-components'
import { ThemeProvider } from 'styled-components'
import { getTheme } from './utils/theme-handler'

const GlobalStyle = createGlobalStyle`
  body {
    background-color: ${({ theme }) => theme.primary};
    color: ${({ theme }) => theme.textColor};
    overflow: hidden;
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

function App() {
  return (
    <ThemeProvider theme={getTheme()}>
      <GlobalStyle />
      <Confetti />
      <PageTitle />
      <BirdNameSection />
      <Footer />
    </ThemeProvider>
  );
}

export default App;
