import React from 'react'
import BirdSvg from '../../Home/components/BirdSvg'
import { getTheme } from '../../../utils/theme-handler'
import { Link } from 'react-router-dom'
import { OptionsButton } from './MenuStyles'

const OptionsAndBadges = () => {
  const { textColor, name } = getTheme()

  const hasUnseenBadges = JSON.parse(localStorage.getItem('hasUnseenBadges'))

  return (
    <Link to='/menu'>
      <OptionsButton hasUnseenBadges={hasUnseenBadges} onClick={() => localStorage.setItem('hasUnseenBadges', false)} >
        <BirdSvg color={textColor} size='1.2rem' theme={name} />
      </OptionsButton>
    </Link>
  )
}

export default OptionsAndBadges
