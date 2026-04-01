'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bird, Trophy, Settings } from 'lucide-react';
import { useStoredBoolean } from '@/hooks/useStoredValue';
import { useSound } from '@/hooks/useSound';
import { NEW_THEME_UNLOCK_STORAGE_KEY, UNSEEN_BADGES_STORAGE_KEY } from '@/lib/utils/player-progress';

const links = [
  { href: '/', label: 'Play', icon: Bird },
  { href: '/rewards', label: 'Rewards', icon: Trophy },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();
  const hasUnseenBadges = useStoredBoolean(UNSEEN_BADGES_STORAGE_KEY);
  const hasNewThemeUnlock = useStoredBoolean(NEW_THEME_UNLOCK_STORAGE_KEY);
  const { play } = useSound();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-[var(--color-surface)] backdrop-blur-md border-t border-[var(--color-surface-border)] px-2 pb-[env(safe-area-inset-bottom)]">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        const showDot = !active && ((href === '/rewards' && hasUnseenBadges) || (href === '/settings' && hasNewThemeUnlock));
        return (
          <Link
            key={href}
            href={href}
            onClick={() => play('navTap')}
            className={`relative flex flex-col items-center gap-1 py-3 px-5 text-xs font-medium transition-colors ${
              active
                ? 'text-[var(--color-secondary)]'
                : 'text-[var(--color-muted)]'
            }`}
          >
            <Icon size={26} strokeWidth={active ? 2.5 : 1.8} />
            {label}
            {showDot && (
              <span className="absolute top-1.5 right-2.5 w-2 h-2 bg-[var(--color-secondary)] rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
