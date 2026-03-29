'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bird, Trophy, Settings } from 'lucide-react';
import { useStoredBoolean } from '@/hooks/useStoredValue';

const links = [
  { href: '/', label: 'Play', icon: Bird },
  { href: '/rewards', label: 'Rewards', icon: Trophy },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();
  const hasUnseenBadges = useStoredBoolean('hasUnseenBadges');

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-[var(--color-surface)] backdrop-blur-md border-t border-[var(--color-surface-border)] px-2 pb-[env(safe-area-inset-bottom)]">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        const showDot = href === '/rewards' && hasUnseenBadges && !active;
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex flex-col items-center gap-0.5 py-2 px-4 text-[0.65rem] font-medium transition-colors ${
              active
                ? 'text-[var(--color-secondary)]'
                : 'text-[var(--color-muted)]'
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
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
