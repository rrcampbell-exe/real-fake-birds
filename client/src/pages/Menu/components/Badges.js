import React from 'react'
import { getTheme } from '../../../utils/theme-handler'
import { AdultMilestone, EggMilestone, FledglingMilestone, HatchlingMilestone, JuvenileMilestone, NestlingMilestone } from '../../../constants/badge-svg'

const Badges = () => {
  const { textColor } = getTheme()
  return (
    <>
      <EggMilestone color={textColor} size='2rem' />
      <HatchlingMilestone color={textColor} size='2rem' />
      <NestlingMilestone color={textColor} size='2rem' />
      <FledglingMilestone color={textColor} size='2rem' />
      <JuvenileMilestone color={textColor} size='2.5rem' />
      <AdultMilestone color={textColor} size='2rem' />
    </>
  )
}

export default Badges
