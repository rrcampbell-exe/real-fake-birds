'use client';

import { Lock } from 'lucide-react';
import BirdhouseToggleButton from '@/components/birdhouse/BirdhouseToggleButton';
import { track } from '@/lib/analytics';

interface GatedBirdhouseButtonProps {
  birdKey: string;
  birdName: string;
  isReal: boolean;
  isGated: boolean;
  iconSize?: number;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  onRequestSwap?: (payload: { birdKey: string; birdName: string; isReal: boolean }) => void;
}

export default function GatedBirdhouseButton({
  birdKey,
  birdName,
  isReal,
  isGated,
  iconSize = 16,
  size = 'sm',
  showLabel = true,
  onRequestSwap,
}: GatedBirdhouseButtonProps) {
  if (!isGated) {
    return (
      <BirdhouseToggleButton
        birdKey={birdKey}
        birdName={birdName}
        isReal={isReal}
        iconSize={iconSize}
        size={size}
        showLabel={showLabel}
        onRequestSwap={onRequestSwap}
      />
    );
  }

  return (
    <button
      type="button"
      disabled
      onClick={() => {
        track('birdhouse_add_gated', { bird_key: birdKey });
      }}
      className="relative inline-flex items-center gap-1 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-muted)] opacity-40 cursor-not-allowed"
      title="Reveal this bird's image to add it to your birdhouse"
    >
      <Lock size={12} strokeWidth={2.5} />
      {showLabel ? <span>Birdhouse</span> : null}
    </button>
  );
}
