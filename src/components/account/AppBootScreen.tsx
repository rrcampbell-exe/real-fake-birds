'use client';

import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import LoadingBirdAnimation from '@/components/LoadingBirdAnimation';
import { finch } from '@/lib/themes';

interface AppBootScreenProps {
  progress: number;
  status: string;
}

const finchBootStyles: CSSProperties = {
  '--color-primary': finch.primary,
  '--color-primary-light': '#267326',
  '--color-secondary': finch.secondary,
  '--color-text': finch.textColor,
  '--color-on-secondary': finch.textColor,
  '--color-surface': 'rgba(255,255,255,0.08)',
  '--color-surface-hover': 'rgba(255,255,255,0.14)',
  '--color-surface-border': 'rgba(255,255,255,0.12)',
  '--color-muted': 'rgba(255,255,255,0.58)',
  '--shadow-card': '0 8px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)',
  '--boot-primary': finch.primary,
  '--boot-primary-light': '#267326',
  '--boot-secondary': finch.secondary,
  '--boot-text': finch.textColor,
  '--boot-muted': 'rgba(255,255,255,0.58)',
  '--boot-surface': 'rgba(255,255,255,0.08)',
  '--boot-surface-hover': 'rgba(255,255,255,0.14)',
  '--boot-surface-border': 'rgba(255,255,255,0.12)',
  '--boot-shadow': '0 8px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)',
} as CSSProperties;

export default function AppBootScreen({ progress, status }: AppBootScreenProps) {
  const safeProgress = Math.max(8, Math.min(progress, 100));
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div
      style={finchBootStyles}
      className="relative flex min-h-dvh flex-col items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_45%),var(--boot-primary)] px-6 py-12 text-center"
    >
      <div className="relative w-full max-w-md rounded-[2rem] border border-[var(--boot-surface-border)] bg-[color-mix(in_srgb,var(--boot-surface)_88%,transparent)] px-6 py-10 shadow-[var(--boot-shadow)] backdrop-blur-md">
        <div className="flex flex-col items-center gap-5">
          <LoadingBirdAnimation size={64} />

          <div className="space-y-2">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-[0.05em] text-[var(--boot-text)]">
              Real Fake Birds
            </h1>
            <p className="text-sm text-[var(--boot-muted)]">
              Some are real. Some are fake. Tell them apart.
            </p>
          </div>

          <div className="w-full space-y-3">
            <div className="h-3 overflow-hidden rounded-full bg-[var(--boot-surface-border)]">
              <motion.div
                className="h-full rounded-full bg-[var(--boot-secondary)]"
                initial={false}
                style={{ width: `${safeProgress}%` }}
                animate={{ width: `${safeProgress}%` }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.35, ease: 'easeOut' }}
              />
            </div>
            <p className="text-sm font-medium text-[var(--boot-text)]">{status}</p>
          </div>
        </div>
      </div>

      <Image
        src="/images/branding/catbird_games_logo_v3.png"
        alt="Catbird Games"
        width={100}
        height={56}
        priority
        unoptimized
        className="absolute bottom-4 left-1/2 -translate-x-1/2 brightness-0 invert transition-opacity duration-700"
      />
    </div>
  );
}
