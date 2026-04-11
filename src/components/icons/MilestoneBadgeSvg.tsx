import Image from 'next/image';
import { milestones } from '@/lib/constants/milestones';

const defaultSize = '3rem';

function toBadgeAssetName(badgeName: string) {
  return badgeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const badgeEntries = milestones.map((milestone) => ({
  badgeName: milestone.badge,
  milestoneValue: milestone.value,
  src: `/images/badges/${toBadgeAssetName(milestone.badge)}.png`,
}));

const milestoneMap = new Map(badgeEntries.map((entry) => [entry.milestoneValue, entry]));
const badgeNameMap = new Map(badgeEntries.map((entry) => [entry.badgeName, entry]));

interface MilestoneBadgeSvgProps {
  milestoneValue?: number;
  badgeName?: string;
  color?: string;
  size?: string;
  containerClassName?: string;
}

export default function MilestoneBadgeSvg({
  milestoneValue,
  badgeName,
  size = defaultSize,
  containerClassName = '',
}: MilestoneBadgeSvgProps) {
  const entry = typeof milestoneValue === 'number'
    ? milestoneMap.get(milestoneValue)
    : badgeName
      ? badgeNameMap.get(badgeName)
      : undefined;

  if (!entry) {
    return null;
  }

  return (
    <div
      className={`relative overflow-hidden rounded-[1rem] border border-[color-mix(in_srgb,var(--color-secondary)_35%,var(--color-surface-border))] bg-[color-mix(in_srgb,var(--color-secondary)_10%,var(--color-surface-hover))] p-1 shadow-sm ${containerClassName}`.trim()}
      style={{ height: size, width: size }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[0.8rem]">
        <Image
          src={entry.src}
          alt={`${entry.badgeName} badge`}
          fill
          sizes={size}
          className="object-contain"
        />
      </div>
    </div>
  );
}
