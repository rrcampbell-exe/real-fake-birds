import React from 'react'
import BirdSvg from '../Home/components/BirdSvg'
import { getTheme, setTheme } from '../../utils/theme-handler'
import { themes } from '../../constants/theme'
import { MenuContent, MenuBody, MenuFooter, BackButton, ThemeButton, ThemeButtonContainer, BadgesContainer, StyledLink } from './components/MenuStyles'
import Badges from './components/Badges'
import { ThemeProvider } from 'styled-components'
import GlobalStyle from '../../GlobalStyles'
import { Link } from 'react-router-dom'
import PageTitle from '../../common/PageTitle'

const Menu = () => {
  const hasBadges = localStorage.getItem('birdMilestonesArray')
  return (
    <ThemeProvider theme={getTheme()}>
      <GlobalStyle />
      <PageTitle />
      <MenuContent>
        <MenuBody>
          {hasBadges &&
            <BadgesContainer>
              <h4>Real Fake Rewards</h4>
              <Badges />
            </BadgesContainer>
          }
          <ThemeButtonContainer>
            <h4>Real Fake Themes</h4>
            {themes.map((theme) => (
              <StyledLink to='/'>
                <ThemeButton onClick={() => { setTheme(JSON.stringify(theme)) }} key={theme.name}>
                  <BirdSvg color={getTheme().textColor} size='16px' theme={theme.name} />
                  {theme.name}
                </ThemeButton>
              </StyledLink>
            ))}
          </ThemeButtonContainer>
        </MenuBody>
        <MenuFooter>
          <Link to='/'>
            <BackButton id='back-button'>Return to Game</BackButton>
          </Link>
        </MenuFooter>
      </MenuContent>
    </ThemeProvider>
  )
}

export default Menu
