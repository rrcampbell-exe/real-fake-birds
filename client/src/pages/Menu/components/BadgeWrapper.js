import React, { useState } from 'react'

const BadgeWrapper = ({ description ,children }) => {
  const [isShown, setIsShown] = useState()
  return (
    <div onMouseEnter={() => console.log('mouse enter description', description)} onMouseLeave={() => console.log('mouse leave description', description)}>
      {children}
    </div>
  )
}

export default BadgeWrapper
