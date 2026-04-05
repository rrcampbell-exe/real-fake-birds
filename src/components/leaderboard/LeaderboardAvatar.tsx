'use client';

import { Bird } from 'lucide-react';
import { findThemeByName } from '@/lib/utils/theme-handler';

interface LeaderboardAvatarProps {
  username: string;
  avatarPalette: string | null;
}

export default function LeaderboardAvatar({ username, avatarPalette }: LeaderboardAvatarProps) {
  const theme = findThemeByName(avatarPalette) ?? findThemeByName('Finch');
  const initial = username.slice(0, 1).toUpperCase();

  return (
    <span
      className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-black/10 shadow-sm"
      style={{
        backgroundColor: theme?.primary,
        color: theme?.secondary,
      }}
      aria-hidden="true"
    >
      {theme ? (
        <Bird size={18} strokeWidth={2.25} />
      ) : (
        <span className="text-xs font-bold">{initial}</span>
      )}
    </span>
  );
}