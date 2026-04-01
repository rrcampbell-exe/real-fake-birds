import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { cardinal, flamingo } from '@/lib/themes';
import ThemeProvider from './ThemeProvider';

const startThemeSong = vi.fn();
const stopThemeSong = vi.fn();
let isMusicMuted = false;

vi.mock('@/hooks/useSound', () => ({
  useSound: () => ({
    startThemeSong,
    stopThemeSong,
    isMusicMuted,
  }),
}));

describe('ThemeProvider', () => {
  it('renders children, applies the stored theme, and starts the theme song', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 400,
        birdsIdentified: 350,
        currentStreak: 0,
        bestStreak: 30,
        justAchievedStreak: false,
        seeds: 0,
      })
    );
    localStorage.setItem('birdTheme', JSON.stringify(cardinal));
    isMusicMuted = false;

    render(
      <ThemeProvider>
        <div>Bird Child</div>
      </ThemeProvider>
    );

    expect(screen.getByText('Bird Child')).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toBe('Cardinal');
    expect(startThemeSong).toHaveBeenCalledWith('/sounds/themes/cardinal.mp3');
  });

  it('falls back from coming-soon themes to Finch', () => {
    localStorage.setItem('birdTheme', JSON.stringify(flamingo));

    render(
      <ThemeProvider>
        <div>Bird Child</div>
      </ThemeProvider>
    );

    expect(document.documentElement.getAttribute('data-theme')).toBe('Finch');
  });

  it('stops the theme song when music is muted and restarts it when unmuted', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 400,
        birdsIdentified: 350,
        currentStreak: 0,
        bestStreak: 30,
        justAchievedStreak: false,
        seeds: 0,
      })
    );
    localStorage.setItem('birdTheme', JSON.stringify(cardinal));
    isMusicMuted = true;

    const { rerender } = render(
      <ThemeProvider>
        <div>Bird Child</div>
      </ThemeProvider>
    );

    expect(stopThemeSong).toHaveBeenCalled();

    isMusicMuted = false;
    rerender(
      <ThemeProvider>
        <div>Bird Child</div>
      </ThemeProvider>
    );

    expect(startThemeSong).toHaveBeenCalledWith('/sounds/themes/cardinal.mp3');
  });
});