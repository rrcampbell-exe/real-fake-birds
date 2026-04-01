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

export default function TopNav() {
  const pathname = usePathname();
  const hasUnseenBadges = useStoredBoolean(UNSEEN_BADGES_STORAGE_KEY);
  const hasNewThemeUnlock = useStoredBoolean(NEW_THEME_UNLOCK_STORAGE_KEY);
  const { play } = useSound();

  return (
    <nav className="hidden md:flex items-center justify-between px-6 py-3 bg-[var(--color-surface)] backdrop-blur-md border-b border-[var(--color-surface-border)]">
      <Link href="/" className="flex flex-col">
        <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-[0.05em] leading-tight">
          Real Fake Birds
        </span>
        <span className="text-[0.65rem] text-[var(--color-muted)] leading-tight">
          Some are real. Some are fake. Tell them apart.
        </span>
      </Link>
      <div className="flex gap-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          const showDot = !active && ((href === '/rewards' && hasUnseenBadges) || (href === '/settings' && hasNewThemeUnlock));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => play('navTap')}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-[var(--color-secondary)] text-[var(--color-on-secondary)]'
                  : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
              }`}
            >
              <Icon size={18} />
              {label}
              {showDot && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--color-secondary)] rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
