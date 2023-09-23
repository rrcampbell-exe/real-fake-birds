import './App.css'
import BirdNameSection from './components/BirdNameSection'
import PageTitle from './components/PageHeader'
import Footer from './components/Footer'
import Confetti from './components/Confetti'
import { createGlobalStyle } from 'styled-components'
import { ThemeProvider } from 'styled-components'
import * as theme from './constants/theme'
import { getTheme } from './utils/theme-handler'

const { defaultTheme, raven } = theme

const GlobalStyle = createGlobalStyle`
  body {
    background-color: ${({ theme }) => theme.primary};
  }
  button {
    background-color: ${({ theme }) => theme.secondary};
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
