'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Bird } from 'lucide-react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { getSoundController } from '@/lib/sound/sound-platform';
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
  const [maskReady, setMaskReady] = useState(false);
  const [showFakeBird, setShowFakeBird] = useState(true);
  const [glitchOffsetX, setGlitchOffsetX] = useState(0);
  const [glitchOffsetY, setGlitchOffsetY] = useState(0);
  const [glitchRotation, setGlitchRotation] = useState(0);
  const [fakeScale, setFakeScale] = useState(1.12);
  const [swapFadeMs, setSwapFadeMs] = useState(130);

  // Base calibration offsets so the dissolving mark sits on the same visual
  // center as the Lucide Bird before we apply micro-jitter.
  const fakeBaseOffsetX = 1.5;
  const fakeBaseOffsetY = -1.5;

  // Play ambient bird chirps while loading data. Stops automatically when this
  // component unmounts (i.e. when the boot sequence completes).
  useEffect(() => {
    const controller = getSoundController();
    controller.startLoop('loadingLoop');
    return () => {
      controller.stopLoop('loadingLoop');
    };
  }, []);

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setMaskReady(true);
    img.onerror = () => setMaskReady(true);
    img.src = '/images/dissolving-bird-mask.png';
  }, []);

  useEffect(() => {
    let active = true;
    let timeoutId: number | undefined;

    const scheduleNextSwap = () => {
      const holdMs = prefersReducedMotion
        ? 900
        : 260 + Math.floor(Math.random() * 520);

      timeoutId = window.setTimeout(() => {
        if (!active) {
          return;
        }

        setShowFakeBird(v => !v);
        setSwapFadeMs(prefersReducedMotion ? 220 : 90 + Math.floor(Math.random() * 110));
        setFakeScale(1.12);

        if (prefersReducedMotion) {
          setGlitchOffsetX(0);
          setGlitchOffsetY(0);
          setGlitchRotation(0);
        } else {
          setGlitchOffsetX((Math.random() * 2 - 1) * 1.6);
          setGlitchOffsetY((Math.random() * 2 - 1) * 1.4);
          setGlitchRotation((Math.random() * 2 - 1) * 6.8);
        }

        scheduleNextSwap();
      }, holdMs);
    };

    scheduleNextSwap();

    return () => {
      active = false;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [prefersReducedMotion]);

  const showFakeBirdEffective = showFakeBird && maskReady;
  const showRealWordGlow = !showFakeBirdEffective;
  const showFakeWordGlow = showFakeBirdEffective;

  return (
    <div
      data-boot-overlay="true"
      style={finchBootStyles}
      className="relative flex min-h-dvh flex-col items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_45%),var(--boot-primary)] px-6 py-12 text-center"
    >
      <div className="relative w-full max-w-md rounded-[2rem] border border-[var(--boot-surface-border)] bg-[color-mix(in_srgb,var(--boot-surface)_88%,transparent)] px-6 py-10 shadow-[var(--boot-shadow)] backdrop-blur-md">
        <div className="flex flex-col items-center gap-5">
          <motion.div className="relative h-16 w-16">
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={false}
              animate={{ opacity: showFakeBirdEffective ? 0 : 1 }}
              transition={{ duration: swapFadeMs / 1000, ease: 'easeInOut' }}
            >
              <Bird size={64} className="text-[var(--boot-secondary)]" aria-hidden={true} />
            </motion.div>

            <motion.div
              className="absolute inset-0 bg-[var(--boot-secondary)]"
              initial={false}
              animate={{
                opacity: showFakeBirdEffective ? 1 : 0,
                x: fakeBaseOffsetX + glitchOffsetX,
                y: fakeBaseOffsetY + glitchOffsetY,
                rotate: glitchRotation,
                scale: fakeScale,
              }}
              transition={{ duration: swapFadeMs / 1000, ease: 'easeInOut' }}
              aria-label="Dissolving bird mark"
              role="img"
              style={{
                WebkitMaskImage: 'url(/images/dissolving-bird-mask.png)',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                WebkitMaskSize: '100% 100%',
                maskImage: 'url(/images/dissolving-bird-mask.png)',
                maskRepeat: 'no-repeat',
                maskPosition: 'center',
                maskSize: '100% 100%',
              }}
            />
          </motion.div>

          <div className="space-y-2">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-[0.05em] text-[var(--boot-text)]">
              <motion.span
                initial={false}
                animate={
                  showRealWordGlow
                    ? {
                      textShadow: [
                        '0 0 0 rgba(0,0,0,0)',
                        '0 0 10px color-mix(in srgb, var(--boot-secondary) 68%, white 32%), 0 0 20px color-mix(in srgb, var(--boot-secondary) 45%, white 55%)',
                        '0 0 0 rgba(0,0,0,0)',
                      ],
                    }
                    : { textShadow: '0 0 0 rgba(0,0,0,0)' }
                }
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.45,
                  repeat: showRealWordGlow && !prefersReducedMotion ? 1 : 0,
                  ease: 'easeInOut',
                }}
              >
                Real
              </motion.span>{' '}
              <motion.span
                initial={false}
                animate={
                  showFakeWordGlow
                    ? {
                      textShadow: [
                        '0 0 0 rgba(0,0,0,0)',
                        '0 0 10px color-mix(in srgb, var(--boot-secondary) 68%, white 32%), 0 0 20px color-mix(in srgb, var(--boot-secondary) 45%, white 55%)',
                        '0 0 0 rgba(0,0,0,0)',
                      ],
                    }
                    : { textShadow: '0 0 0 rgba(0,0,0,0)' }
                }
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.45,
                  repeat: showFakeWordGlow && !prefersReducedMotion ? 1 : 0,
                  ease: 'easeInOut',
                }}
              >
                Fake
              </motion.span>{' '}
              <motion.span
                initial={false}
                animate={
                  prefersReducedMotion
                    ? {
                      textShadow: '0 0 8px color-mix(in srgb, var(--boot-secondary) 55%, white 45%), 0 0 16px color-mix(in srgb, var(--boot-secondary) 40%, white 60%)',
                      opacity: 1,
                    }
                    : {
                      textShadow: [
                        '0 0 8px color-mix(in srgb, var(--boot-secondary) 55%, white 45%), 0 0 16px color-mix(in srgb, var(--boot-secondary) 40%, white 60%)',
                        '0 0 11px color-mix(in srgb, var(--boot-secondary) 68%, white 32%), 0 0 22px color-mix(in srgb, var(--boot-secondary) 50%, white 50%)',
                        '0 0 6px color-mix(in srgb, var(--boot-secondary) 48%, white 52%), 0 0 12px color-mix(in srgb, var(--boot-secondary) 34%, white 66%)',
                        '0 0 12px color-mix(in srgb, var(--boot-secondary) 72%, white 28%), 0 0 24px color-mix(in srgb, var(--boot-secondary) 54%, white 46%)',
                        '0 0 8px color-mix(in srgb, var(--boot-secondary) 55%, white 45%), 0 0 16px color-mix(in srgb, var(--boot-secondary) 40%, white 60%)',
                      ],
                      opacity: [1, 0.94, 0.98, 0.9, 1],
                    }
                }
                transition={{
                  duration: prefersReducedMotion ? 0 : 2.1,
                  repeat: prefersReducedMotion ? 0 : Infinity,
                  ease: 'easeInOut',
                  times: [0, 0.24, 0.5, 0.78, 1],
                }}
              >
                Birds
              </motion.span>
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
