'use client';

import { motion } from 'framer-motion';
import { Birdhouse } from 'lucide-react';
import { useAccountState } from '@/components/account/AccountStateProvider';
import { useBirdhouse } from '@/hooks/useBirdhouse';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useSound } from '@/hooks/useSound';
import { pushBirdhouseToAccount } from '@/lib/auth/account-session';
import { formatBirdName } from '@/lib/utils/format-bird-name';

interface BirdhouseToggleButtonProps {
  birdKey: string;
  birdName: string;
  isReal: boolean;
  className?: string;
  iconSize?: number;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  isLocked?: boolean;
  lockedTitle?: string;
  lockedAriaLabel?: string;
  onLockedClick?: () => void;
  onRequestSwap?: (payload: { birdKey: string; birdName: string; isReal: boolean }) => void;
}

export default function BirdhouseToggleButton({
  birdKey,
  birdName,
  isReal,
  className = '',
  iconSize = 18,
  size = 'md',
  showLabel = false,
  isLocked = false,
  lockedTitle,
  lockedAriaLabel,
  onLockedClick,
  onRequestSwap,
}: BirdhouseToggleButtonProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { isSignedIn } = useAccountState();
  const { play } = useSound();
  const { add, isInBirdhouse, remove } = useBirdhouse();
  const inBirdhouse = isInBirdhouse(birdKey);
  const displayBirdName = formatBirdName(birdName);
  const defaultAriaLabel = inBirdhouse
    ? `Remove ${displayBirdName} from Birdhouse`
    : `Add ${displayBirdName} to Birdhouse`;
  const defaultTitle = inBirdhouse ? 'Remove from Birdhouse' : 'Add to Birdhouse';

  const handleToggle = () => {
    if (isLocked) {
      onLockedClick?.();
      return;
    }

    if (inBirdhouse) {
      remove(birdKey, isReal);
      play('release');
      if (isSignedIn) {
        void pushBirdhouseToAccount();
      }
      return;
    }

    const nextStore = add(birdKey, isReal);
    if (nextStore === null) {
      onRequestSwap?.({ birdKey, birdName, isReal });
      return;
    }

    play('collect');
    if (isSignedIn) {
      void pushBirdhouseToAccount();
    }
  };

  return (
    <motion.button
      type="button"
      onClick={handleToggle}
      aria-label={isLocked ? (lockedAriaLabel ?? defaultAriaLabel) : defaultAriaLabel}
      title={isLocked ? (lockedTitle ?? defaultTitle) : defaultTitle}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}
      animate={prefersReducedMotion ? undefined : { scale: !isLocked && inBirdhouse ? [1, 1.08, 1] : 1 }}
      transition={{ duration: 0.2 }}
      className={`inline-flex items-center justify-end gap-2 rounded-full border font-semibold transition ${size === 'sm' ? 'px-3 py-1.5 text-xs' : 'min-h-10 px-3 py-2 text-sm'} ${
        inBirdhouse
          ? 'border-[var(--color-secondary)] bg-[color-mix(in_srgb,var(--color-secondary)_16%,var(--color-surface))] text-[var(--color-secondary)] hover:bg-[color-mix(in_srgb,var(--color-secondary)_22%,var(--color-surface))]'
          : 'border-[var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
      } ${isLocked ? 'cursor-help' : ''} ${className}`}
    >
      {showLabel ? <span className="whitespace-nowrap">{inBirdhouse ? '✓ Birdhouse' : '+ Birdhouse'}</span> : null}
      <Birdhouse size={iconSize} strokeWidth={inBirdhouse ? 2.5 : 2} fill={inBirdhouse ? 'currentColor' : 'none'} />
    </motion.button>
  );
}