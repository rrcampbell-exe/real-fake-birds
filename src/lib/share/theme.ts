import { finch } from '@/lib/themes';
import { findThemeByName } from '@/lib/utils/theme-handler';

export interface ShareCardPalette {
  background: string;
  backgroundAccent: string;
  backgroundOrb: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  mutedText: string;
  accent: string;
  accentText: string;
  success: string;
  error: string;
  streak: string;
  gold: string;
  silver: string;
  bronze: string;
}

function normalizeHex(hex: string): string {
  const value = hex.replace('#', '').trim();

  if (value.length === 3) {
    return `#${value.split('').map((character) => `${character}${character}`).join('')}`;
  }

  return `#${value.slice(0, 6)}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = normalizeHex(hex).replace('#', '');
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function toHex([red, green, blue]: [number, number, number]): string {
  return `#${[red, green, blue]
    .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0'))
    .join('')}`;
}

function rgba(hex: string, alpha: number): string {
  const [red, green, blue] = hexToRgb(hex);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function mix(colorA: string, colorB: string, weight = 0.5): string {
  const [redA, greenA, blueA] = hexToRgb(colorA);
  const [redB, greenB, blueB] = hexToRgb(colorB);
  const inverseWeight = 1 - weight;

  return toHex([
    redA * inverseWeight + redB * weight,
    greenA * inverseWeight + greenB * weight,
    blueA * inverseWeight + blueB * weight,
  ] as [number, number, number]);
}

function getRelativeLuminance(hex: string): number {
  const [red, green, blue] = hexToRgb(hex).map((value) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}

function getContrastText(background: string): string {
  return getRelativeLuminance(background) > 0.45 ? '#1A1A1A' : '#FFFFFF';
}

export function createShareCardPalette(themeName?: string | null): ShareCardPalette {
  const theme = findThemeByName(themeName) ?? finch;
  const text = normalizeHex(theme.textColor);
  const accent = normalizeHex(theme.secondary);
  const background = normalizeHex(theme.primary);
  const orbBase = getRelativeLuminance(background) > 0.4 ? '#FFFFFF' : '#000000';

  return {
    background,
    backgroundAccent: mix(background, accent, 0.34),
    backgroundOrb: rgba(orbBase, 0.12),
    surface: rgba(text, 0.1),
    surfaceMuted: rgba(text, 0.16),
    border: rgba(text, 0.2),
    text,
    mutedText: rgba(text, getRelativeLuminance(text) > 0.5 ? 0.72 : 0.82),
    accent,
    accentText: getContrastText(accent),
    success: '#BBF7D0',
    error: '#FFE4E6',
    streak: '#FEF3C7',
    gold: '#F4C95D',
    silver: '#D4D8DD',
    bronze: '#C98A52',
  };
}