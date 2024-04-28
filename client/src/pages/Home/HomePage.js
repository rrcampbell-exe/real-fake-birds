import BirdNameSection from './components/BirdNameSection'
import PageTitle from '../../common/PageTitle'
import Footer from './components/Footer'
import Confetti from './components/Confetti'
import GlobalStyle from '../../GlobalStyles'
import { ThemeProvider } from 'styled-components'
import { getTheme } from '../../utils/theme-handler'
import styled from 'styled-components'
import { Analytics } from '@vercel/analytics/react'

const PageContainer = styled.div`
  overflow: hidden;
`

function HomePage() {
  return (
    <ThemeProvider theme={getTheme()}>
      <PageContainer>
        <GlobalStyle />
        <Confetti />
        <PageTitle />
        <BirdNameSection />
        <Analytics />
        <Footer />
      </PageContainer>
    </ThemeProvider>
  );
}

export default HomePage;
