import React from 'react'
import { getTheme } from '../../../utils/theme-handler'
import MilestoneBadgeSvg from './MilestoneBadgeSvg'
import Badge from './Badge'
import { BadgeCollectionContainer } from './MenuStyles'

const BadgesSection = () => {
  const { textColor } = getTheme()
  const milestonesArray = JSON.parse(localStorage.getItem('birdMilestonesArray'))
  return (
    <BadgeCollectionContainer>
      {milestonesArray.map((achievement) => (
        <Badge badge={achievement.badge} description={achievement.description} achievement={achievement.achievement}>
          <MilestoneBadgeSvg color={textColor} milestone={achievement.value} key={achievement.value} />
        </Badge>
      ))}
    </BadgeCollectionContainer>
  )
}

export default BadgesSection
