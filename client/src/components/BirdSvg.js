import React from 'react'
import { Default, Raven, Robin, Flamingo, Gull, Swan } from '../constants/bird-svg'

const BirdSvg = ({ color, size, theme }) => {
  switch (theme) {
    case 'Default':
      return <Default color={color} size={size} />
    case 'Raven':
      return <Raven color={color} size={size} />
    case 'Flamingo':
      return <Flamingo color={color} size={size} />
    case 'Gull':
      return <Gull color={color} size={size} />
    case 'Swan':
      return <Swan color={color} size={size} />
    case 'Robin':
      return <Robin color={color} size={size} />
    default:
      return <Default color={color} size={size} />
  }
}

export default BirdSvg
