'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useSound } from '@/hooks/useSound';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { secondaryNavLinks } from './nav-links';

interface RouteNotification {
  show: boolean;
  label?: string;
}

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications?: Partial<Record<(typeof secondaryNavLinks)[number]['href'], RouteNotification>>;
}

export default function MenuDrawer({ isOpen, onClose, notifications }: MenuDrawerProps) {
  const pathname = usePathname();
  const { play } = useSound();
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const slideVariants = {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-[60]">
          <motion.button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          />
          <motion.aside
            className="absolute inset-y-0 right-0 flex w-full max-w-xs flex-col overflow-y-auto border-l border-[var(--color-surface-border)] bg-[color-mix(in_srgb,var(--color-primary)_72%,black)] px-4 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))] shadow-2xl"
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: [0.32, 0.72, 0, 1] }}
          >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
              Menu
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold leading-tight text-[var(--color-text)]">
              Where are we flying next?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
              Missions, milestones, and more.
            </p>
          </div>
          <button
            type="button"
            aria-label="Dismiss menu"
            onClick={() => {
              play('navTap');
              onClose();
            }}
            className="rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-2 text-[var(--color-text)] transition hover:bg-[var(--color-surface-hover)]"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="mt-8 flex flex-col gap-3">
          {secondaryNavLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            const notification = notifications?.[href];

            return (
              <Link
                key={href}
                href={href}
                onClick={() => {
                  play('navTap');
                  onClose();
                }}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-4 transition ${
                  active
                    ? 'border-[var(--color-secondary)] bg-[var(--color-secondary)] text-[var(--color-on-secondary)]'
                    : 'border-[var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                <div className="relative">
                  <Icon size={20} />
                  {notification?.show ? (
                    <span className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full ${active ? 'bg-[var(--color-on-secondary)]' : 'bg-[var(--color-secondary)]'}`} />
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold leading-none">{label}</span>
                    {notification?.show && notification.label ? (
                      <span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-semibold ${active ? 'bg-[var(--color-on-secondary)]/18 text-[var(--color-on-secondary)]' : 'bg-[var(--color-surface-hover)] text-[var(--color-secondary)]'}`}>
                        New Notification
                      </span>
                    ) : null}
                  </div>
                  <span className={`mt-1 text-xs ${active ? 'text-[var(--color-on-secondary)]/80' : 'text-[var(--color-muted)]'}`}>
                    {href === '/daily'
                      ? 'Today\'s mission set and streak status'
                      : href === '/leaderboard'
                        ? 'This week\'s live standings'
                      : href === '/journal'
                        ? 'Your collection of birds'
                        : href === '/birdhouse'
                          ? 'Your hand-picked bird gallery'
                      : href === '/profile'
                        ? 'Your progress, trophies, and stats'
                        : 'Themes, audio, and gameplay options'}
                  </span>
                  {notification?.show && notification.label ? (
                    <span className={`mt-2 text-[0.72rem] leading-5 ${active ? 'text-[var(--color-on-secondary)]' : 'text-[var(--color-text)]'}`}>
                      {notification.label}
                    </span>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto pt-8 flex items-center gap-4">
          <Link
            href="/privacy"
            onClick={onClose}
            className="text-xs text-[var(--color-muted)] underline decoration-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-text)]"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            onClick={onClose}
            className="text-xs text-[var(--color-muted)] underline decoration-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-text)]"
          >
            Terms
          </Link>
        </div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}