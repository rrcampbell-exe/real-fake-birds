'use client';

import { Bird } from 'lucide-react';
import { findThemeByName } from '@/lib/utils/theme-handler';

interface LeaderboardAvatarProps {
  username: string;
  avatarPalette: string | null;
  size?: 'sm' | 'lg';
}

export default function LeaderboardAvatar({ username, avatarPalette, size = 'sm' }: LeaderboardAvatarProps) {
  const theme = findThemeByName(avatarPalette) ?? findThemeByName('Finch');
  const initial = username.slice(0, 1).toUpperCase();

  const sizeClasses = size === 'lg' ? 'h-21 w-21' : 'h-10 w-10';
  const birdSize = size === 'lg' ? 48 : 18;

  return (
    <span
      className={`inline-flex ${sizeClasses} items-center justify-center overflow-hidden rounded-full border border-black/10 shadow-sm`}
      style={{
        backgroundColor: theme?.primary,
        color: theme?.secondary,
      }}
      aria-hidden="true"
    >
      {theme ? (
        <Bird size={birdSize} strokeWidth={2.25} />
      ) : (
        <span className={size === 'lg' ? 'text-base font-bold' : 'text-xs font-bold'}>{initial}</span>
      )}
    </span>
  );
}