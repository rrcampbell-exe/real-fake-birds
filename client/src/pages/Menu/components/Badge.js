import React, { useState } from 'react'
import { BadgeWrapper, BadgeDescriptionTooltip, BadgeName, BadgeDescription } from './MenuStyles'

const Badge = ({ badge, description, achievement, children }) => {
  const [isDescriptionShown, setIsDescriptionShown] = useState(false)
  return (
    <BadgeWrapper onMouseEnter={() => setIsDescriptionShown(true)} onMouseLeave={() => setIsDescriptionShown(false)}>
      {children}
      {isDescriptionShown &&
        <BadgeDescriptionTooltip>
          <BadgeName>{badge}</BadgeName>
          <BadgeDescription>{description}</BadgeDescription>
          <BadgeDescription>{achievement}</BadgeDescription>
        </BadgeDescriptionTooltip>}
    </BadgeWrapper>
  )
}

export default Badge
