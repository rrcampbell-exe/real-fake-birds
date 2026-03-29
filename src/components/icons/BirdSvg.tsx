import type { SvgIconProps } from '@/types';
import { Finch, Raven, Flamingo, Gull, Swan, Robin } from './bird-svgs';

const birdMap: Record<string, React.FC<SvgIconProps>> = {
  Finch,
  Raven,
  Flamingo,
  Gull,
  Swan,
  Robin,
};

interface BirdSvgProps extends SvgIconProps {
  themeName: string;
}

export default function BirdSvg({ themeName, color, size }: BirdSvgProps) {
  const Bird = birdMap[themeName];
  if (!Bird) return null;
  return <Bird color={color} size={size} />;
}
