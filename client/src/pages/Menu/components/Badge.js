import React, { useState } from 'react'
import styled from 'styled-components'

const BadgeWrapper = styled.div`
  display: flex;
  flex-direction: column;
`

const BadgeDescriptionTooltip = styled.div`
  width: fit-content;
  max-width: 170px;
  margin-top: 60px;
  margin-left: -60px;
  background-color: ${({ theme }) => theme.secondary};
  color: ${({ theme }) => theme.textColor};
  text-align: center;
  padding: 5px;
  border: 1px solid ${({ theme }) => theme.textColor};
  border-radius: 4px;
  position: absolute;
  z-index: 1;
`

const BadgeName = styled.p`
  margin-top: 0;
  margin-bottom: 1rem;
  font-weight: 500;
  font-size: 0.875rem;
`

const BadgeDescription = styled.p`
  font-size: 0.75rem;
  margin-top: 0.5rem;
`

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
