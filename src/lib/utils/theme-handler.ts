import type { Theme } from '@/types';
import { finch, themes } from '@/lib/themes';
import { notifyStoredValueChanged } from '@/hooks/useStoredValue';
import { getUnlockedThemeNames } from '@/lib/utils/player-progress';

function normalizeThemeName(themeName: string): string {
  return themeName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function findThemeByName(themeName: string | null | undefined): Theme | undefined {
  if (!themeName) {
    return undefined;
  }

  const normalizedThemeName = normalizeThemeName(themeName);
  return themes.find((currentTheme) => normalizeThemeName(currentTheme.name) === normalizedThemeName);
}

export function resolveTheme(themeLike: Pick<Theme, 'name'> | null | undefined): Theme {
  if (!themeLike?.name) return finch;

  const theme = findThemeByName(themeLike.name);
  if (!theme) return finch;

  if (typeof window !== 'undefined') {
    const unlockedThemeNames = new Set(getUnlockedThemeNames());
    if (!unlockedThemeNames.has(theme.name)) {
      return finch;
    }
  }

  return theme;
}

export function setTheme(theme: Theme): void {
  localStorage.setItem('birdTheme', JSON.stringify(resolveTheme(theme)));
  notifyStoredValueChanged('birdTheme');
}

export function getUnlockedThemes(): Theme[] {
  if (typeof window === 'undefined') return [finch];

  const unlockedThemeNames = new Set(getUnlockedThemeNames());
  return themes.filter((theme) => unlockedThemeNames.has(theme.name));
}

export function getTheme(): Theme {
  if (typeof window === 'undefined') return finch;
  const stored = localStorage.getItem('birdTheme');
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Theme;
      return resolveTheme(parsed);
    } catch {
      // fall through to default
    }
  }
  return finch;
}
