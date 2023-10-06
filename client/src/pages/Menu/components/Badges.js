import React from 'react'
import { getTheme } from '../../../utils/theme-handler'
import MilestoneBadgeSvg from './MilestoneBadgeSvg'
import BadgeWrapper from './BadgeWrapper'

const Badges = () => {
  const { textColor } = getTheme()
  const milestonesArray = JSON.parse(localStorage.getItem('birdMilestonesArray'))
  // TODO: now that achievement.description works, let's get a hover window there or create a static place that tells people what each badge is
  return (
    milestonesArray.map((achievement) => (
      <BadgeWrapper description={achievement.description}>
        <MilestoneBadgeSvg color={textColor} milestone={achievement.value} key={achievement.value} />
      </BadgeWrapper>
    ))
  )
}

export default Badges
