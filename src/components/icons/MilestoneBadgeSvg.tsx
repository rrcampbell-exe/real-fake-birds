import type { SvgIconProps } from '@/types';
import {
  DownyFeatherBadge,
  ContourFeatherBadge,
  TailFeatherBadge,
  WingFeatherBadge,
  FlightFeatherBadge,
  IridescentFeatherBadge,
  CrestFeatherBadge,
  PlumeBadge,
  QuillBadge,
  BronzeFeatherBadge,
  SilverFeatherBadge,
  GoldFeatherBadge,
  PlatinumFeatherBadge,
  DiamondFeatherBadge,
  OpalFeatherBadge,
  PhoenixFeatherBadge,
  AuroraFeatherBadge,
  CelestialFeatherBadge,
  EternalFeatherBadge,
} from './badge-svgs';

const milestoneMap: Record<number, { component: React.FC<SvgIconProps>; defaultSize: string }> = {
  10: { component: DownyFeatherBadge, defaultSize: '3rem' },
  25: { component: ContourFeatherBadge, defaultSize: '3rem' },
  50: { component: TailFeatherBadge, defaultSize: '3rem' },
  75: { component: WingFeatherBadge, defaultSize: '3rem' },
  100: { component: FlightFeatherBadge, defaultSize: '3rem' },
  150: { component: IridescentFeatherBadge, defaultSize: '3rem' },
  200: { component: CrestFeatherBadge, defaultSize: '3rem' },
  275: { component: PlumeBadge, defaultSize: '3.5rem' },
  350: { component: QuillBadge, defaultSize: '3.5rem' },
  450: { component: BronzeFeatherBadge, defaultSize: '3rem' },
  550: { component: SilverFeatherBadge, defaultSize: '3rem' },
  700: { component: GoldFeatherBadge, defaultSize: '3rem' },
  850: { component: PlatinumFeatherBadge, defaultSize: '3rem' },
  1000: { component: DiamondFeatherBadge, defaultSize: '3rem' },
  1250: { component: OpalFeatherBadge, defaultSize: '3rem' },
  1500: { component: PhoenixFeatherBadge, defaultSize: '3rem' },
  2000: { component: AuroraFeatherBadge, defaultSize: '3rem' },
  2500: { component: CelestialFeatherBadge, defaultSize: '3rem' },
  3000: { component: EternalFeatherBadge, defaultSize: '3rem' },
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
