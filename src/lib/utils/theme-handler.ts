import type { Theme } from '@/types';
import { finch, themes } from '@/lib/themes';
import { notifyStoredValueChanged } from '@/hooks/useStoredValue';

export function setTheme(theme: Theme): void {
  localStorage.setItem('birdTheme', JSON.stringify(theme));
  notifyStoredValueChanged('birdTheme');
}

export function getTheme(): Theme {
  if (typeof window === 'undefined') return finch;
  const stored = localStorage.getItem('birdTheme');
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Theme;
      // Validate that the theme name is one we recognize
      if (themes.some((t) => t.name === parsed.name)) return parsed;
    } catch {
      // fall through to default
    }
  }
  return finch;
}
