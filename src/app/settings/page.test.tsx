import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAccountState } from '@/components/account/AccountStateProvider';
import SettingsPage from './page';

vi.mock('@/components/account/AccountStateProvider', () => ({
  useAccountState: vi.fn(() => ({
    isLoadingAccount: false,
    accountEmail: null,
    accountUsername: null,
    remoteSummary: null,
    remoteUnlockedThemes: [],
    refreshAccountState: vi.fn(),
  })),
}));

vi.mock('@/hooks/useSound', () => ({
  useSound: () => ({
    isSfxMuted: false,
    sfxVolume: 1,
    isMusicMuted: false,
    musicVolume: 1,
    setSfxMuted: vi.fn(),
    setSfxVolume: vi.fn(),
    setMusicMuted: vi.fn(),
    setMusicVolume: vi.fn(),
    play: vi.fn(),
  }),
}));

const mockedUseAccountState = vi.mocked(useAccountState);

describe('SettingsPage theme unlocking', () => {
  it('prompts for locked themes and explains missing seeds and birds', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 0,
        birdsIdentified: 0,
        currentStreak: 0,
        justAchievedStreak: false,
        bestStreak: 0,
        seeds: 0,
      })
    );

    render(<SettingsPage />);

    fireEvent.click(screen.getByRole('button', { name: /raven/i }));

    expect(screen.getByText('Unlock Raven for 10 seeds?')).toBeInTheDocument();
    expect(screen.getByText(/You need 10 more seeds to buy this theme\./i)).toBeInTheDocument();
    expect(screen.getByText(/correctly identify 10 more birds to unlock it naturally/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm Unlock' })).toBeDisabled();
    expect(localStorage.getItem('birdTheme') ?? '').not.toContain('Raven');
  });

  it('requires confirmation before spending seeds and unlocking a theme', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 0,
        birdsIdentified: 0,
        currentStreak: 0,
        justAchievedStreak: false,
        bestStreak: 0,
        seeds: 10,
      })
    );

    render(<SettingsPage />);

    fireEvent.click(screen.getByRole('button', { name: /raven/i }));

  expect(screen.getByText(/You have 10 seeds, so you can unlock this theme now\./i)).toBeInTheDocument();
  expect(screen.getByText(/correctly identify 10 more birds to unlock it naturally\./i)).toBeInTheDocument();
    expect(localStorage.getItem('birdTheme') ?? '').not.toContain('Raven');

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Unlock' }));

    expect(localStorage.getItem('birdTheme')).toContain('Raven');
    expect(localStorage.getItem('unlockedThemes')).toContain('Raven');
    expect(JSON.parse(localStorage.getItem('birdScore')!)).toMatchObject({ seeds: 0 });
  });

  it('uses the fresher local seed count when signed-in account state is stale', () => {
    mockedUseAccountState.mockReturnValue({
      isLoadingAccount: false,
      accountEmail: 'bird@example.com',
      accountUsername: 'BirdFan_17',
      remoteSummary: {
        birdsIdentified: 80,
        seeds: 98,
        bestStreak: 12,
        bestDailyStreak: 4,
      },
      remoteUnlockedThemes: [],
      refreshAccountState: vi.fn(),
    });

    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 120,
        birdsIdentified: 80,
        currentStreak: 3,
        justAchievedStreak: false,
        bestStreak: 12,
        currentDailyStreak: 1,
        bestDailyStreak: 4,
        seeds: 104,
      })
    );

    render(<SettingsPage />);

    fireEvent.click(screen.getByRole('button', { name: /woodpecker/i }));

    expect(screen.getByText(/You have 104 seeds, so you can unlock this theme now\./i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm Unlock' })).not.toBeDisabled();
  });
});