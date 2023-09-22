import './App.css'
import BirdNameSection from './components/BirdNameSection'
import PageTitle from './components/PageHeader'
import Footer from './components/Footer'
import Confetti from './components/Confetti'
import themes from './constants/themes'
import { createGlobalStyle } from 'styled-components'

const GlobalStyle = createGlobalStyle`
  body {
    background-color: ${themes.default.primary};
  }
  button {
    background-color: ${themes.default.secondary};
  }
`

function App() {
  return (
    <>
      <GlobalStyle />
      <Confetti />
      <PageTitle />
      <BirdNameSection />
      <Footer />
    </>
  );
}

export default App;
