import type { SvgIconProps } from '@/types';
import {
  EggMilestone,
  HatchlingMilestone,
  NestlingMilestone,
  FledglingMilestone,
  JuvenileMilestone,
  RealGrownMilestone,
  ElderbirdMilestone,
  BirdgodMilestone,
} from './badge-svgs';

const milestoneMap: Record<number, { component: React.FC<SvgIconProps>; defaultSize: string }> = {
  10: { component: EggMilestone, defaultSize: '3rem' },
  25: { component: HatchlingMilestone, defaultSize: '3rem' },
  50: { component: NestlingMilestone, defaultSize: '3rem' },
  100: { component: FledglingMilestone, defaultSize: '3rem' },
  250: { component: JuvenileMilestone, defaultSize: '3.5rem' },
  500: { component: RealGrownMilestone, defaultSize: '3rem' },
  750: { component: ElderbirdMilestone, defaultSize: '3rem' },
  1000: { component: BirdgodMilestone, defaultSize: '3rem' },
};

interface MilestoneBadgeSvgProps {
  milestoneValue: number;
  color: string;
}

export default function MilestoneBadgeSvg({ milestoneValue, color }: MilestoneBadgeSvgProps) {
  const entry = milestoneMap[milestoneValue];
  if (!entry) return null;
  const { component: Badge, defaultSize } = entry;
  return <Badge color={color} size={defaultSize} />;
}
