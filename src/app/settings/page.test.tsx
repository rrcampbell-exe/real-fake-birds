import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAccountState } from '@/components/account/AccountStateProvider';
import { getThemeUnlockByThemeName } from '@/lib/constants/theme-unlocks';
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

function createAccountState(overrides: Partial<ReturnType<typeof useAccountState>> = {}): ReturnType<typeof useAccountState> {
  return {
    isLoadingAccount: false,
    isSignedIn: false,
    isBooting: false,
    isBackgroundSyncing: false,
    isAppChromeVisible: true,
    accountEmail: null,
    accountUsername: null,
    remoteSummary: null,
    remoteUnlockedThemes: [],
    weeklyOverview: null,
    refreshAccountState: vi.fn().mockResolvedValue(undefined),
    syncSignedInProgress: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('SettingsPage theme unlocking', () => {
  it('prompts for locked themes and explains missing seeds and birds', () => {
    const ravenUnlock = getThemeUnlockByThemeName('Raven');
    expect(ravenUnlock).toBeDefined();

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

    expect(screen.getByText(`Unlock Raven for ${ravenUnlock?.seedCost} seeds?`)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`You need ${ravenUnlock?.seedCost} more seeds to buy this theme\\.`, 'i'))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`correctly identify ${ravenUnlock?.milestoneValue} more birds to unlock it naturally`, 'i'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm Unlock' })).toBeDisabled();
    expect(localStorage.getItem('birdTheme') ?? '').not.toContain('Raven');
  });

  it('requires confirmation before spending seeds and unlocking a theme', () => {
    const ravenUnlock = getThemeUnlockByThemeName('Raven');
    expect(ravenUnlock).toBeDefined();

    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 0,
        birdsIdentified: 0,
        currentStreak: 0,
        justAchievedStreak: false,
        bestStreak: 0,
        seeds: ravenUnlock?.seedCost ?? 0,
      })
    );

    render(<SettingsPage />);

    fireEvent.click(screen.getByRole('button', { name: /raven/i }));

    expect(screen.getByText(new RegExp(`You have ${ravenUnlock?.seedCost} seeds, so you can unlock this theme now\\.`, 'i'))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`correctly identify ${ravenUnlock?.milestoneValue} more birds to unlock it naturally\\.`, 'i'))).toBeInTheDocument();
    expect(localStorage.getItem('birdTheme') ?? '').not.toContain('Raven');

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Unlock' }));

    expect(localStorage.getItem('birdTheme')).toContain('Raven');
    expect(localStorage.getItem('unlockedThemes')).toContain('Raven');
    expect(JSON.parse(localStorage.getItem('birdScore')!)).toMatchObject({ seeds: 0 });
  });

  it('uses the fresher local seed count when signed-in account state is stale', () => {
    const gullUnlock = getThemeUnlockByThemeName('Gull');
    expect(gullUnlock).toBeDefined();

    mockedUseAccountState.mockReturnValue(createAccountState({
      isSignedIn: true,
      accountEmail: null,
      accountUsername: 'BirdFan_17',
      remoteSummary: {
        birdsIdentified: 40,
        seeds: (gullUnlock?.seedCost ?? 0) - 10,
        bestStreak: 12,
        bestDailyStreak: 4,
        bestWeeklyPlacement: null,
        firstPlaceCount: 0,
        secondPlaceCount: 0,
        thirdPlaceCount: 0,
      },
      remoteUnlockedThemes: [],
      refreshAccountState: vi.fn().mockResolvedValue(undefined),
    }));

    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 120,
        birdsIdentified: 40,
        currentStreak: 3,
        justAchievedStreak: false,
        bestStreak: 12,
        currentDailyStreak: 1,
        bestDailyStreak: 4,
        seeds: gullUnlock?.seedCost,
      })
    );

    render(<SettingsPage />);

    fireEvent.click(screen.getByRole('button', { name: /gull/i }));

    expect(screen.getByText(new RegExp(`You have ${gullUnlock?.seedCost} seeds, so you can unlock this theme now\\.`, 'i'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm Unlock' })).not.toBeDisabled();
  });
});