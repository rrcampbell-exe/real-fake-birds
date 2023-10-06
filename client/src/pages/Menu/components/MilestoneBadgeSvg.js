import React from 'react'
import { EggMilestone, HatchlingMilestone, NestlingMilestone, FledglingMilestone, JuvenileMilestone, RealGrownMilestone } from '../../../constants/badge-svg'

const MilestoneBadgeSvg = ({ color, milestone }) => {
  switch (milestone) {
    case 10:
      return <EggMilestone color={color} size='3rem' />
    case 25:
      return <HatchlingMilestone color={color} size='3rem' />
    case 50:
      return <NestlingMilestone color={color} size='3rem' />
    case 100:
      return <FledglingMilestone color={color} size='3rem' />
    case 250:
      return <JuvenileMilestone color={color} size='3.5rem' />
    case 500:
      return <RealGrownMilestone color={color} size='3rem' />
    default:
      return <EggMilestone color={color} size='3rem' />
  }
}

export default MilestoneBadgeSvg
